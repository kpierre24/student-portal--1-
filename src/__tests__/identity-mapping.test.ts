import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request } from 'express';
import { resolveUserFromRequest } from '../server/middleware/rbac';
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

describe('Immutable Identity Mapping: firebase_uid -> internal_user_id', () => {
  let mockReq: Partial<Request>;
  let auditLogSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';

    mockReq = {
      headers: {
        authorization: 'Bearer valid-firebase-token',
        'x-request-id': 'req-test-id-mapping',
        'user-agent': 'TestAgent/1.0',
      },
      ip: '192.168.1.100',
      socket: { remoteAddress: '192.168.1.100' } as any,
    };

    auditLogSpy = vi.spyOn(supabaseServer, 'logAuditEvent').mockResolvedValue(true);
  });

  afterEach(() => {
    supabaseServer.setServerSupabaseClient(null);
    vi.clearAllMocks();
  });

  it('resolves user primarily by firebase_uid even if token email has changed', async () => {
    const firebaseUid = 'fb-uid-dr-johnson-456';
    const oldEmailInDb = 'old.johnson@hteim.edu';
    const newEmailInToken = 'johnson.chair@hteim.edu';

    vi.spyOn(firebaseAuth, 'verifyIdToken').mockResolvedValue({
      uid: firebaseUid,
      email: newEmailInToken,
      name: 'Dr. Johnson',
    } as any);

    const updateEmailMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockSupabase: any = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_identities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      user_id: 'user-uuid-johnson-internal',
                      users: {
                        id: 'user-uuid-johnson-internal',
                        email: oldEmailInDb,
                        role: 'teacher',
                        is_active: true,
                        assigned_courses: ['BIB-101'],
                        firebase_uid: firebaseUid,
                      },
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'users') {
          return {
            update: updateEmailMock,
          };
        }
        if (table === 'students') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'prof-johnson', first_name: 'Dr.', last_name: 'Johnson' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      }),
    };

    supabaseServer.setServerSupabaseClient(mockSupabase);

    const user = await resolveUserFromRequest(mockReq as Request);

    expect(user).not.toBeNull();
    // Resolves to internal PostgreSQL user UUID, retaining elevated lecturer role
    expect(user?.userId).toBe('user-uuid-johnson-internal');
    expect(user?.role).toBe('lecturer');
    expect(user?.uid).toBe(firebaseUid);

    // Email attribute is synchronized in users table as profile attribute
    expect(updateEmailMock).toHaveBeenCalledWith(
      exp.objectContaining({
        email: newEmailInToken,
      })
    );

    // Audit log records the profile email update
    expect(auditLogSpy).toHaveBeenCalledWith(
      exp.objectContaining({
        action: 'update_profile_email',
        entityType: 'user_profile',
        entityId: 'user-uuid-johnson-internal',
        oldValues: { email: oldEmailInDb },
        newValues: { email: newEmailInToken },
      })
    );
  });

  it('automatically establishes immutable mapping for a legacy user on first authentication', async () => {
    const firebaseUid = 'fb-uid-legacy-student';
    const studentEmail = 'legacy.student@hteim.edu';

    vi.spyOn(firebaseAuth, 'verifyIdToken').mockResolvedValue({
      uid: firebaseUid,
      email: studentEmail,
      name: 'Legacy Student',
    } as any);

    const updateUsersMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const insertIdentityMock = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase: any = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_identities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: insertIdentityMock,
          };
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockImplementation((field: string, val: string) => {
                if (field === 'firebase_uid') {
                  // Not yet in users.firebase_uid column
                  return { maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
                }
                if (field === 'email') {
                  // Found legacy user by email
                  return {
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: 'legacy-user-uuid-999',
                        email: studentEmail,
                        role: 'student',
                        is_active: true,
                        firebase_uid: null,
                      },
                      error: null,
                    }),
                  };
                }
                return { maybeSingle: vi.fn().mockResolvedValue({ data: null }) };
              }),
            })),
            update: updateUsersMock,
          };
        }
        if (table === 'students') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'std-legacy-rec', student_number: 'SOM-2026-999' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          };
        }
        return {};
      }),
    };

    supabaseServer.setServerSupabaseClient(mockSupabase);

    const user = await resolveUserFromRequest(mockReq as Request);

    expect(user).not.toBeNull();
    expect(user?.userId).toBe('legacy-user-uuid-999');

    // Users table was updated to bind firebase_uid
    expect(updateUsersMock).toHaveBeenCalledWith(
      exp.objectContaining({
        firebase_uid: firebaseUid,
      })
    );

    // user_identities table was populated with immutable mapping
    expect(insertIdentityMock).toHaveBeenCalledWith({
      user_id: 'legacy-user-uuid-999',
      provider: 'firebase',
      provider_uid: firebaseUid,
      email: studentEmail,
    });
  });

  it('rejects authentication for inactive/suspended accounts resolved by firebase_uid', async () => {
    const firebaseUid = 'fb-uid-suspended-user';

    vi.spyOn(firebaseAuth, 'verifyIdToken').mockResolvedValue({
      uid: firebaseUid,
      email: 'suspended.user@hteim.edu',
    } as any);

    const mockSupabase: any = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_identities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      user_id: 'suspended-uuid-1',
                      users: {
                        id: 'suspended-uuid-1',
                        email: 'suspended.user@hteim.edu',
                        role: 'student',
                        is_active: false, // Inactive!
                        firebase_uid: firebaseUid,
                      },
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };

    supabaseServer.setServerSupabaseClient(mockSupabase);

    const user = await resolveUserFromRequest(mockReq as Request);
    expect(user).toBeNull();
  });
});
