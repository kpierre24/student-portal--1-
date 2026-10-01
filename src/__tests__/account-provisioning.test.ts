import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request } from 'express';
import {
  resolveUserFromRequest,
  checkEnrollmentMatch,
  isAdministrativeRole,
  isElevatedStaffOrLecturerRole,
} from '../server/middleware/rbac';
import * as supabaseServer from '../server/services/supabaseServer';
import * as firebaseAuth from '../server/services/firebaseAuth';

// Mock the external logger
vi.mock('../lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const exp: any = expect;

describe('Automatic Account Provisioning Security Controls', () => {
  let mockReq: Partial<Request>;
  let auditLogSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';

    mockReq = {
      headers: {
        authorization: 'Bearer valid-firebase-token',
        'x-request-id': 'req-test-123',
        'user-agent': 'TestAgent/1.0',
      },
      ip: '192.168.1.50',
      socket: { remoteAddress: '192.168.1.50' } as any,
    };

    // Spy on logAuditEvent
    auditLogSpy = vi.spyOn(supabaseServer, 'logAuditEvent').mockResolvedValue(true);
  });

  afterEach(() => {
    supabaseServer.setServerSupabaseClient(null);
    vi.clearAllMocks();
  });

  describe('Role Discriminator Helpers', () => {
    it('correctly identifies administrative roles', () => {
      expect(isAdministrativeRole('admin')).toBe(true);
      expect(isAdministrativeRole('super_admin')).toBe(true);
      expect(isAdministrativeRole('lecturer')).toBe(false);
      expect(isAdministrativeRole('student')).toBe(false);
      expect(isAdministrativeRole(null)).toBe(false);
    });

    it('correctly identifies elevated staff and lecturer roles', () => {
      expect(isElevatedStaffOrLecturerRole('lecturer')).toBe(true);
      expect(isElevatedStaffOrLecturerRole('teacher')).toBe(true);
      expect(isElevatedStaffOrLecturerRole('staff')).toBe(true);
      expect(isElevatedStaffOrLecturerRole('registrar')).toBe(true);
      expect(isElevatedStaffOrLecturerRole('finance_officer')).toBe(true);
      expect(isElevatedStaffOrLecturerRole('librarian')).toBe(true);
      expect(isElevatedStaffOrLecturerRole('student')).toBe(false);
      expect(isElevatedStaffOrLecturerRole('admin')).toBe(false);
    });
  });

  describe('Rule 1: Students may be automatically activated from valid enrollment', () => {
    it('automatically provisions an active student account in PostgreSQL and logs audit event', async () => {
      const studentEmail = 'mary.student@hteim.edu';

      vi.spyOn(firebaseAuth, 'verifyIdToken').mockResolvedValue({
        uid: 'firebase-uid-mary',
        email: studentEmail,
        name: 'Mary Student',
      } as any);

      const insertUserMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'user-uuid-mary-123',
              email: studentEmail,
              role: 'student',
              is_active: true,
              assigned_courses: [],
            },
            error: null,
          }),
        }),
      });

      const updateStudentMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const mockSupabase: any = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
              insert: insertUserMock,
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            };
          }
          if (table === 'students') {
            return {
              select: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'std-rec-uuid-1', student_number: 'SOM-2026-001', user_id: null },
                    error: null,
                  }),
                }),
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'std-rec-uuid-1', student_number: 'SOM-2026-001' },
                    error: null,
                  }),
                }),
              }),
              update: updateStudentMock,
            };
          }
          if (table === 'course_offerings') {
            return {
              select: vi.fn().mockReturnValue({
                ilike: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase);

      const user = await resolveUserFromRequest(mockReq as Request);

      // Student successfully resolved and authenticated
      expect(user).not.toBeNull();
      expect(user?.role).toBe('student');
      expect(user?.email).toBe(studentEmail);
      expect(user?.userId).toBe('user-uuid-mary-123');
      expect(user?.studentRecordId).toBe('std-rec-uuid-1');

      // Users table inserted with role 'student' and immutable firebase_uid
      expect(insertUserMock).toHaveBeenCalledWith({
        email: studentEmail,
        role: 'student',
        is_active: true,
        firebase_uid: 'firebase-uid-mary',
      });

      // Audit event was logged with source record and reason
      expect(auditLogSpy).toHaveBeenCalledWith(
        exp.objectContaining({
          action: 'auto_provision_student',
          entityType: 'user_provisioning',
          entityId: 'user-uuid-mary-123',
          actorRole: 'system',
          reason: 'Automatic student account activation from verified enrollment record',
          newValues: exp.objectContaining({
            email: studentEmail,
            role: 'student',
            studentRecordId: 'std-rec-uuid-1',
            sourceRecord: exp.objectContaining({
              table: 'students',
              id: 'std-rec-uuid-1',
            }),
          }),
        })
      );
    });
  });

  describe('Rule 2: Lecturers and staff require administrator approval', () => {
    it('blocks automatic activation for a prospective lecturer found in course_offerings and logs audit event', async () => {
      const lecturerEmail = 'lecturer.smith@hteim.edu';

      vi.spyOn(firebaseAuth, 'verifyIdToken').mockResolvedValue({
        uid: 'firebase-uid-lecturer',
        email: lecturerEmail,
        name: 'Pastor Smith',
      } as any);

      const insertUserMock = vi.fn();

      const mockSupabase: any = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
              insert: insertUserMock,
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            };
          }
          if (table === 'students') {
            return {
              select: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            };
          }
          if (table === 'course_offerings') {
            return {
              select: vi.fn().mockReturnValue({
                ilike: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'offering-uuid-101',
                      lecturer_email: lecturerEmail,
                      lecturer_name: 'Pastor Smith',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase);

      const user = await resolveUserFromRequest(mockReq as Request);

      // Access must be denied pending administrator approval
      expect(user).toBeNull();

      // Users table must NEVER have been inserted
      expect(insertUserMock).not.toHaveBeenCalled();

      // Audit log must record the blocked attempt with source record and approval reason
      expect(auditLogSpy).toHaveBeenCalledWith(
        exp.objectContaining({
          action: 'provisioning_blocked_approval_required',
          entityType: 'user_provisioning',
          entityId: lecturerEmail,
          actorRole: 'system',
          reason: 'Security Policy: Lecturers and staff require administrator approval prior to account activation',
          newValues: exp.objectContaining({
            email: lecturerEmail,
            candidateRole: 'lecturer',
            status: 'pending_approval',
            sourceRecord: exp.objectContaining({
              table: 'course_offerings',
              id: 'offering-uuid-101',
            }),
          }),
        })
      );
    });

    it('blocks automatic activation for staff role found in profiles table and logs audit event', async () => {
      const staffEmail = 'finance.officer@hteim.edu';

      vi.spyOn(firebaseAuth, 'verifyIdToken').mockResolvedValue({
        uid: 'firebase-uid-staff',
        email: staffEmail,
        name: 'Finance Officer',
      } as any);

      const insertUserMock = vi.fn();

      const mockSupabase: any = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
              insert: insertUserMock,
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'prof-uuid-staff-1',
                      first_name: 'Grace',
                      last_name: 'Officer',
                      email: staffEmail,
                      role: 'finance_officer',
                      students: null,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase);

      const user = await resolveUserFromRequest(mockReq as Request);

      // Access must be denied
      expect(user).toBeNull();
      expect(insertUserMock).not.toHaveBeenCalled();

      // Audit event must be logged
      expect(auditLogSpy).toHaveBeenCalledWith(
        exp.objectContaining({
          action: 'provisioning_blocked_approval_required',
          entityType: 'user_provisioning',
          entityId: staffEmail,
          newValues: exp.objectContaining({
            candidateRole: 'finance_officer',
            status: 'pending_approval',
            sourceRecord: exp.objectContaining({
              table: 'profiles',
              id: 'prof-uuid-staff-1',
            }),
          }),
        })
      );
    });
  });

  describe('Rule 3: Administrative roles must never be granted through automatic enrollment', () => {
    it('strictly prohibits automatic enrollment from granting admin role', async () => {
      const adminEmail = 'rogue.admin@hteim.edu';

      vi.spyOn(firebaseAuth, 'verifyIdToken').mockResolvedValue({
        uid: 'firebase-uid-rogue',
        email: adminEmail,
        name: 'Rogue Admin',
      } as any);

      const insertUserMock = vi.fn();

      const mockSupabase: any = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
              insert: insertUserMock,
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'prof-uuid-rogue-admin',
                      first_name: 'Rogue',
                      last_name: 'Admin',
                      email: adminEmail,
                      role: 'admin',
                      students: null,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase);

      const user = await resolveUserFromRequest(mockReq as Request);

      // Access must be rejected
      expect(user).toBeNull();
      expect(insertUserMock).not.toHaveBeenCalled();

      // High-severity security audit event logged
      expect(auditLogSpy).toHaveBeenCalledWith(
        exp.objectContaining({
          action: 'provisioning_blocked_admin_prohibited',
          entityType: 'user_provisioning',
          entityId: adminEmail,
          actorRole: 'system',
          reason: 'Security Policy: Administrative roles must never be granted through automatic enrollment',
          newValues: exp.objectContaining({
            email: adminEmail,
            attemptedRole: 'admin',
            status: 'blocked_prohibited',
            sourceRecord: exp.objectContaining({
              table: 'profiles',
              id: 'prof-uuid-rogue-admin',
            }),
          }),
        })
      );
    });

    it('strictly prohibits automatic enrollment from granting super_admin role', async () => {
      const superAdminEmail = 'attempted.super@hteim.edu';

      vi.spyOn(firebaseAuth, 'verifyIdToken').mockResolvedValue({
        uid: 'firebase-uid-super',
        email: superAdminEmail,
        name: 'Attempted Super',
      } as any);

      const insertUserMock = vi.fn();

      const mockSupabase: any = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
              insert: insertUserMock,
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'prof-uuid-super',
                      first_name: 'Super',
                      last_name: 'Attempt',
                      email: superAdminEmail,
                      role: 'super_admin',
                      students: null,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase);

      const user = await resolveUserFromRequest(mockReq as Request);

      expect(user).toBeNull();
      expect(insertUserMock).not.toHaveBeenCalled();
      expect(auditLogSpy).toHaveBeenCalledWith(
        exp.objectContaining({
          action: 'provisioning_blocked_admin_prohibited',
          entityType: 'user_provisioning',
          entityId: superAdminEmail,
          newValues: exp.objectContaining({
            attemptedRole: 'super_admin',
            status: 'blocked_prohibited',
          }),
        })
      );
    });
  });

  describe('Explicit Administrator Provisioning and Approvals', () => {
    it('allows administrators to explicitly provision lecturer accounts with audit logging', async () => {
      const lecturerEmail = 'approved.lecturer@hteim.edu';
      const adminUserId = '00000000-0000-0000-0000-000000000001';
      const auditInsertMock = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase: any = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  single: vi.fn().mockResolvedValue({ data: { id: adminUserId }, error: null }),
                }),
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'user-uuid-approved-lecturer',
                      email: lecturerEmail,
                      role: 'teacher',
                      is_active: true,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'students') {
            return {
              select: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === 'audit_history') {
            return {
              insert: auditInsertMock,
            };
          }
          return {};
        }),
      };

      supabaseServer.setServerSupabaseClient(mockSupabase);
      vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase);

      const result = await supabaseServer.provisionOrApproveUserByAdmin({
        email: lecturerEmail,
        role: 'lecturer',
        actorUserId: adminUserId,
        actorRole: 'admin',
        reason: 'Approved by academic dean for Biblical Hermeneutics module',
      });

      expect(result.success).toBe(true);
      expect(result.user?.id).toBe('user-uuid-approved-lecturer');
      expect(result.user?.role).toBe('teacher');

      expect(auditInsertMock).toHaveBeenCalledWith(
        exp.objectContaining({
          action: 'admin_provision_user',
          entity_type: 'user_provisioning',
          entity_id: 'user-uuid-approved-lecturer',
          actor_user_id: adminUserId,
          actor_role: 'admin',
          reason: 'Approved by academic dean for Biblical Hermeneutics module',
        })
      );
    });

    it('rejects attempt to assign super_admin via administrative provisioning API', async () => {
      const mockSupabase: any = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      };
      supabaseServer.setServerSupabaseClient(mockSupabase);
      vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase);

      const result = await supabaseServer.provisionOrApproveUserByAdmin({
        email: 'attacker@hteim.edu',
        role: 'super_admin',
        actorUserId: '00000000-0000-0000-0000-000000000001',
        actorRole: 'admin',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('The super_admin role cannot be assigned via client API calls');
    });
  });
});
