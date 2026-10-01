import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission, requireResourceOwnership, verifyLecturerCourseInDatabase } from '../server/middleware/rbac';
import { studentsService } from '../server/services/domain/studentsService';
import { attendanceService } from '../server/services/domain/attendanceService';
import { assignmentsService } from '../server/services/domain/assignmentsService';
import { financeService } from '../server/services/domain/financeService';
import * as supabaseServer from '../server/services/supabaseServer';
import { AuthenticatedUser, UserRole, ROLE_DEFINITIONS } from '../types/rbac';

// Mock logger
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

/**
 * Helper to build an AuthenticatedUser for testing
 */
function createTestUser(
  role: UserRole,
  overrides?: Partial<AuthenticatedUser>
): AuthenticatedUser {
  const roleDef = ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS.student;
  const id = overrides?.id || overrides?.userId || `${role}-uuid-1111-2222-3333`;
  return {
    uid: `firebase-${role}-uid`,
    userId: id,
    id: id,
    email: `${role}@som.hteim.org`,
    name: `${role.toUpperCase()} Test User`,
    role: role,
    studentRecordId: role === 'student' ? 'student-record-uuid-123' : undefined,
    studentNumber: role === 'student' ? 'SOM-2026-0001' : undefined,
    studentName: role === 'student' ? 'Student Test User' : undefined,
    permissions: roleDef.permissions,
    ...overrides,
  };
}

describe('Comprehensive Authorization & Security Matrix (Role x Resource)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let statusSpy: any;
  let jsonSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    statusSpy = vi.fn().mockReturnThis();
    jsonSpy = vi.fn().mockReturnThis();

    mockReq = {
      headers: {},
      query: {},
      body: {},
      socket: { remoteAddress: '127.0.0.1' } as any,
    };

    mockRes = {
      status: statusSpy,
      json: jsonSpy,
    };

    mockNext = vi.fn();

    // Default mock Supabase for database lookups in RBAC middleware
    const mockSupabase = {
      from: vi.fn((table: string) => {
        const queryChain: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
        return queryChain;
      }),
    };
    vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /* ========================================================================
   * 1. MATRIX: STUDENT PROFILE & IDENTIFIER ACCESS
   * ======================================================================== */
  describe('Matrix 1: Student Record & Profile Access', () => {
    const studentUser = createTestUser('student', {
      userId: 'user-stu-1',
      studentRecordId: 'stu-rec-1',
      studentNumber: 'SOM-2026-0001',
      studentName: 'Alice Student',
    });

    const otherStudentUser = createTestUser('student', {
      userId: 'user-stu-2',
      studentRecordId: 'stu-rec-2',
      studentNumber: 'SOM-2026-0002',
      studentName: 'Bob Student',
    });

    const registrarUser = createTestUser('registrar');
    const lecturerUser = createTestUser('lecturer');
    const adminUser = createTestUser('admin');
    const superAdminUser = createTestUser('super_admin');

    it('Student -> Own Data: Can view own student profile (ALLOWED ✅)', async () => {
      mockReq.user = studentUser;
      mockReq.params = { id: 'stu-rec-1' };

      const ownershipMiddleware = requireResourceOwnership({
        getTarget: (req) => ({ targetStudentId: req.params.id }),
        allowedRoles: ['super_admin', 'admin', 'registrar'],
      });

      await ownershipMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalledWith(403);
    });

    it('Student -> Other Student: Cannot view other student profile (BLOCKED 403 ❌)', async () => {
      mockReq.user = studentUser;
      mockReq.params = { id: 'stu-rec-2' }; // Bob's ID

      const ownershipMiddleware = requireResourceOwnership({
        getTarget: (req) => ({ targetStudentId: req.params.id }),
        allowedRoles: ['super_admin', 'admin', 'registrar'],
      });

      await ownershipMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(403);
    });

    it('Registrar -> Any Student: Can view and manage student records (ALLOWED ✅)', async () => {
      mockReq.user = registrarUser;
      mockReq.params = { id: 'stu-rec-2' };

      const ownershipMiddleware = requireResourceOwnership({
        getTarget: (req) => ({ targetStudentId: req.params.id }),
        allowedRoles: ['super_admin', 'admin', 'registrar'],
      });

      await ownershipMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('Lecturer -> Student Record Direct Modification: Denied without course context or admin/registrar role (BLOCKED 400/403 ❌)', async () => {
      mockReq.user = lecturerUser;
      mockReq.params = { id: 'stu-rec-2' };

      const ownershipMiddleware = requireResourceOwnership({
        getTarget: (req) => ({ targetStudentId: req.params.id }),
        allowedRoles: ['super_admin', 'admin', 'registrar'],
      });

      await ownershipMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400); // Missing required course context for faculty
    });

    it('Admin & Super Admin -> Any Student: Full management access (ALLOWED ✅)', async () => {
      for (const u of [adminUser, superAdminUser]) {
        mockNext = vi.fn();
        mockReq.user = u;
        mockReq.params = { id: 'stu-rec-2' };

        const ownershipMiddleware = requireResourceOwnership({
          getTarget: (req) => ({ targetStudentId: req.params.id }),
          allowedRoles: ['super_admin', 'admin', 'registrar'],
        });

        await ownershipMiddleware(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }
    });
  });

  /* ========================================================================
   * 2. MATRIX: ATTENDANCE & SESSIONS ACCESS
   * ======================================================================== */
  describe('Matrix 2: Attendance Scoping & Check-in', () => {
    const assignedOfferingCourse = 'd2222222-2222-4222-8222-222222222222';
    const unassignedOfferingCourse = 'd9999999-9999-4999-8999-999999999999';

    const lecturerUser = createTestUser('lecturer', {
      userId: 'c1111111-1111-4111-8111-111111111111',
    });

    const studentUser = createTestUser('student');
    const financeUser = createTestUser('finance_officer');
    const adminUser = createTestUser('admin');
    const superAdminUser = createTestUser('super_admin');

    it('Student -> Attendance Write: Cannot record or override attendance (BLOCKED 403 ❌)', () => {
      mockReq.user = studentUser;
      const permCheck = requirePermission(['attendance:write', 'all:access']);
      permCheck(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(403);
    });

    it('Finance Officer -> Attendance Write: Cannot mark attendance (BLOCKED 403 ❌)', () => {
      mockReq.user = financeUser;
      const permCheck = requirePermission(['attendance:write', 'all:access']);
      permCheck(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(403);
    });

    it('Lecturer -> Own Course: Can mark attendance for assigned course (ALLOWED ✅)', async () => {
      // Mock relational link in database: users.id -> course_offerings.lecturer_user_id
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'course_offerings') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              or: vi.fn().mockReturnThis(),
              is: vi.fn().mockReturnThis(),
              limit: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'offering-123' },
                error: null,
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      };

      vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase as any);

      mockReq.user = lecturerUser;
      mockReq.body = { courseCode: assignedOfferingCourse };

      const ownershipMiddleware = requireResourceOwnership({
        getTarget: (req) => ({ courseCode: req.body.courseCode }),
        allowedRoles: ['super_admin', 'admin', 'registrar'],
      });

      await ownershipMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('Lecturer -> Other Course: Blocked from marking attendance for unassigned course (BLOCKED 403 ❌)', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'course_offerings') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              or: vi.fn().mockReturnThis(),
              is: vi.fn().mockReturnThis(),
              limit: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: null, // No matching lecturer_user_id
                error: null,
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      };

      vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase as any);

      mockReq.user = lecturerUser;
      mockReq.body = { courseCode: unassignedOfferingCourse };

      const ownershipMiddleware = requireResourceOwnership({
        getTarget: (req) => ({ courseCode: req.body.courseCode }),
        allowedRoles: ['super_admin', 'admin', 'registrar'],
      });

      await ownershipMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(403);
    });

    it('Admin & Super Admin -> Any Course Attendance: Unrestricted marking (ALLOWED ✅)', async () => {
      for (const u of [adminUser, superAdminUser]) {
        mockNext = vi.fn();
        mockReq.user = u;
        mockReq.body = { courseCode: unassignedOfferingCourse };

        const ownershipMiddleware = requireResourceOwnership({
          getTarget: (req) => ({ courseCode: req.body.courseCode }),
          allowedRoles: ['super_admin', 'admin', 'registrar'],
        });

        await ownershipMiddleware(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }
    });
  });

  /* ========================================================================
   * 3. MATRIX: ASSIGNMENTS & GRADING
   * ======================================================================== */
  describe('Matrix 3: Assignments & Grading Operations', () => {
    const ownCourseId = 'c2222222-2222-4222-8222-222222222222';
    const otherCourseId = 'c9999999-9999-4999-8999-999999999999';

    const studentUser = createTestUser('student');
    const lecturerUser = createTestUser('lecturer', { userId: 'c1111111-1111-4111-8111-111111111111' });
    const financeUser = createTestUser('finance_officer');
    const adminUser = createTestUser('admin');
    const superAdminUser = createTestUser('super_admin');

    it('Student -> Assignment Submission: Permitted to submit own assignment (ALLOWED ✅)', () => {
      mockReq.user = studentUser;
      const permCheck = requirePermission(['assignments:submit', 'all:access']);
      permCheck(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('Student -> Assignment Grading: Denied grading permission (BLOCKED 403 ❌)', () => {
      mockReq.user = studentUser;
      const permCheck = requirePermission(['assignments:grade', 'all:access']);
      permCheck(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(403);
    });

    it('Finance Officer -> Assignment Grading: Denied grading permission (BLOCKED 403 ❌)', () => {
      mockReq.user = financeUser;
      const permCheck = requirePermission(['assignments:grade', 'all:access']);
      permCheck(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(403);
    });

    it('Lecturer -> Own Course Grading: Permitted when assigned to course (ALLOWED ✅)', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'offering-own' },
            error: null,
          }),
        })),
      };
      vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase as any);

      mockReq.user = lecturerUser;
      mockReq.body = { courseCode: ownCourseId };

      const ownershipMiddleware = requireResourceOwnership({
        getTarget: (req) => ({ courseCode: req.body.courseCode }),
        allowedRoles: ['super_admin', 'admin', 'registrar'],
      });

      await ownershipMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('Lecturer -> Other Course Grading: Denied when not assigned to course (BLOCKED 403 ❌)', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null, // Not assigned
            error: null,
          }),
        })),
      };
      vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase as any);

      mockReq.user = lecturerUser;
      mockReq.body = { courseCode: otherCourseId };

      const ownershipMiddleware = requireResourceOwnership({
        getTarget: (req) => ({ courseCode: req.body.courseCode }),
        allowedRoles: ['super_admin', 'admin', 'registrar'],
      });

      await ownershipMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(403);
    });

    it('Admin & Super Admin -> Grading Any Course: Full grading access (ALLOWED ✅)', async () => {
      for (const u of [adminUser, superAdminUser]) {
        mockNext = vi.fn();
        mockReq.user = u;
        mockReq.body = { courseCode: otherCourseId };

        const ownershipMiddleware = requireResourceOwnership({
          getTarget: (req) => ({ courseCode: req.body.courseCode }),
          allowedRoles: ['super_admin', 'admin', 'registrar'],
        });

        await ownershipMiddleware(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }
    });
  });

  /* ========================================================================
   * 4. MATRIX: FINANCE & TUITION LEDGER
   * ======================================================================== */
  describe('Matrix 4: Finance & Tuition Ledger', () => {
    const studentUser = createTestUser('student', {
      studentRecordId: 'stu-rec-1',
      studentNumber: 'SOM-2026-0001',
      studentName: 'Alice Student',
    });

    const lecturerUser = createTestUser('lecturer');
    const registrarUser = createTestUser('registrar');
    const financeUser = createTestUser('finance_officer');
    const adminUser = createTestUser('admin');
    const superAdminUser = createTestUser('super_admin');

    it('Student -> Own Invoices: Can read financial ledger scoped to self (ALLOWED ✅)', () => {
      mockReq.user = studentUser;
      const permCheck = requirePermission(['finance:read', 'all:access']);
      permCheck(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('Student -> Finance Write/Invoicing: Denied creating invoices (BLOCKED 403 ❌)', () => {
      mockReq.user = studentUser;
      const permCheck = requirePermission(['finance:write', 'all:access']);
      permCheck(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(403);
    });

    it('Lecturer -> Finance Write/Refund: Denied financial write operations (BLOCKED 403 ❌)', () => {
      mockReq.user = lecturerUser;
      const permCheck = requirePermission(['finance:write', 'all:access']);
      permCheck(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(403);
    });

    it('Registrar -> Direct Financial Refunds: Denied without finance write permission (BLOCKED 403 ❌)', () => {
      mockReq.user = registrarUser;
      const permCheck = requirePermission(['finance:refund', 'all:access']);
      permCheck(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(403);
    });

    it('Finance Officer -> Invoicing, Payments, Refunds: Full finance access (ALLOWED ✅)', () => {
      mockReq.user = financeUser;

      for (const permission of ['finance:read', 'finance:write', 'finance:refund'] as const) {
        mockNext = vi.fn();
        const permCheck = requirePermission([permission, 'all:access']);
        permCheck(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }
    });

    it('Admin & Super Admin -> Full Finance & Ledger Operations (ALLOWED ✅)', () => {
      for (const u of [adminUser, superAdminUser]) {
        mockReq.user = u;
        for (const permission of ['finance:read', 'finance:write', 'finance:refund'] as const) {
          mockNext = vi.fn();
          const permCheck = requirePermission([permission, 'all:access']);
          permCheck(mockReq as Request, mockRes as Response, mockNext);
          expect(mockNext).toHaveBeenCalled();
        }
      }
    });
  });

  /* ========================================================================
   * 5. MATRIX: ADMINISTRATIVE GOVERNANCE & SECURITY AUDIT
   * ======================================================================== */
  describe('Matrix 5: User Provisioning, Role Management, and Audit Logs', () => {
    const studentUser = createTestUser('student');
    const lecturerUser = createTestUser('lecturer');
    const financeUser = createTestUser('finance_officer');
    const registrarUser = createTestUser('registrar');
    const adminUser = createTestUser('admin');
    const superAdminUser = createTestUser('super_admin');

    it('Non-Admin Roles (Student, Lecturer, Finance, Registrar) -> User Management (BLOCKED 403 ❌)', () => {
      for (const user of [studentUser, lecturerUser, financeUser, registrarUser]) {
        mockNext = vi.fn();
        mockReq.user = user;
        const permCheck = requirePermission(['users:manage', 'all:access']);
        permCheck(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(statusSpy).toHaveBeenCalledWith(403);
      }
    });

    it('Non-Admin Roles (Student, Lecturer) -> Audit Logs Access (BLOCKED 403 ❌)', () => {
      for (const user of [studentUser, lecturerUser]) {
        mockNext = vi.fn();
        mockReq.user = user;
        const permCheck = requirePermission(['audit:read', 'all:access']);
        permCheck(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(statusSpy).toHaveBeenCalledWith(403);
      }
    });

    it('Authorized Roles (Registrar, Finance Officer, Admin, Super Admin) -> Audit Logs (ALLOWED ✅)', () => {
      for (const user of [registrarUser, financeUser, adminUser, superAdminUser]) {
        mockNext = vi.fn();
        mockReq.user = user;
        const permCheck = requirePermission(['audit:read', 'all:access']);
        permCheck(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      }
    });

    it('Admin & Super Admin -> User & Role Management (ALLOWED ✅)', () => {
      for (const user of [adminUser, superAdminUser]) {
        mockNext = vi.fn();
        mockReq.user = user;
        const permCheck = requirePermission(['users:manage', 'roles:manage', 'all:access']);
        permCheck(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      }
    });
  });

  /* ========================================================================
   * 6. TABULAR MATRIX VERIFICATION SUMMARY ASSERTION
   * ======================================================================== */
  describe('Matrix 6: Comprehensive Tabular RBAC Matrix Summary Table', () => {
    interface MatrixCell {
      role: UserRole;
      ownData: boolean;
      otherStudentData: boolean;
      ownCourse: boolean;
      otherCourse: boolean;
      financeAccess: 'none' | 'own_only' | 'appropriate' | 'full';
      governanceAccess: boolean;
    }

    const expectedMatrix: MatrixCell[] = [
      { role: 'student', ownData: true, otherStudentData: false, ownCourse: false, otherCourse: false, financeAccess: 'own_only', governanceAccess: false },
      { role: 'lecturer', ownData: true, otherStudentData: false, ownCourse: true, otherCourse: false, financeAccess: 'none', governanceAccess: false },
      { role: 'registrar', ownData: true, otherStudentData: true, ownCourse: false, otherCourse: false, financeAccess: 'appropriate', governanceAccess: false },
      { role: 'finance_officer', ownData: true, otherStudentData: false, ownCourse: false, otherCourse: false, financeAccess: 'full', governanceAccess: false },
      { role: 'admin', ownData: true, otherStudentData: true, ownCourse: true, otherCourse: true, financeAccess: 'full', governanceAccess: true },
      { role: 'super_admin', ownData: true, otherStudentData: true, ownCourse: true, otherCourse: true, financeAccess: 'full', governanceAccess: true },
    ];

    for (const testCase of expectedMatrix) {
      it(`Matrix matches security specification for role: '${testCase.role}'`, () => {
        const user = createTestUser(testCase.role);
        const perms = new Set(user.permissions);
        const isSuperOrAdmin = perms.has('all:access') || perms.has('users:manage');

        // Check Own Data
        expect(perms.has('students:read') || perms.has('all:access')).toBe(testCase.ownData);

        // Check Other Student Data Management
        const canManageOtherStudents = perms.has('all:access') || (perms.has('students:write') && ['super_admin', 'admin', 'registrar'].includes(testCase.role));
        expect(canManageOtherStudents).toBe(testCase.otherStudentData);

        // Check Own Course Teaching / Grading
        const canTeachOwn = perms.has('all:access') || (perms.has('attendance:write') && perms.has('assignments:grade'));
        expect(canTeachOwn).toBe(testCase.ownCourse);

        // Check Other Course Teaching (Strictly reserved for Admin / Super Admin)
        expect(isSuperOrAdmin).toBe(testCase.otherCourse);

        // Check Finance Ledger Scope
        if (testCase.financeAccess === 'full') {
          expect(perms.has('finance:write') || perms.has('all:access')).toBe(true);
        } else if (testCase.financeAccess === 'own_only') {
          expect(perms.has('finance:read')).toBe(true);
          expect(perms.has('finance:write')).toBe(false);
        } else if (testCase.financeAccess === 'none') {
          expect(perms.has('finance:write')).toBe(false);
          expect(perms.has('finance:refund')).toBe(false);
        }

        // Check Governance & Role Provisioning
        expect(isSuperOrAdmin).toBe(testCase.governanceAccess);
      });
    }
  });
});

