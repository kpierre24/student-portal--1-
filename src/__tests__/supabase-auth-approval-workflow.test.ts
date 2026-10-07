import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  registerAccountRequestInDatabase,
  getAccountApprovalStatus,
  approveAccountRequestInDatabase,
  rejectAccountRequestInDatabase,
  getPendingAccountApprovals,
  setServerSupabaseClient,
} from '../server/services/supabaseServer';

describe('Supabase Authentication & Account Approval Workflow', () => {
  let mockSupabase: any;
  let requestsStore: any[] = [];
  let usersStore: any[] = [];
  let auditLogsStore: any[] = [];

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';

    requestsStore = [];
    usersStore = [];
    auditLogsStore = [];

    // Create a mock Supabase client simulating PostgreSQL tables
    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'user_approval_requests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((field: string, val: any) => ({
                order: vi.fn(() => ({
                  data: requestsStore.filter(r => r[field] === val),
                  error: null,
                })),
                data: requestsStore.filter(r => r[field] === val),
                error: null,
                maybeSingle: vi.fn(() => ({
                  data: requestsStore.find(r => r[field] === val) || null,
                  error: null,
                })),
              })),
              or: vi.fn((_expr: string) => ({
                maybeSingle: vi.fn(() => {
                  const match = requestsStore.find(r => 
                    _expr.includes(r.email) || _expr.includes(r.id) || (r.user_id && _expr.includes(r.user_id))
                  );
                  return { data: match || null, error: null };
                }),
              })),
            })),
            upsert: vi.fn((row: any) => {
              const existingIdx = requestsStore.findIndex(r => r.email === row.email);
              const saved = { id: `req-${Date.now()}`, ...row };
              if (existingIdx >= 0) {
                requestsStore[existingIdx] = { ...requestsStore[existingIdx], ...saved };
              } else {
                requestsStore.push(saved);
              }
              return {
                select: vi.fn(() => ({
                  single: vi.fn(() => ({ data: saved, error: null })),
                })),
              };
            }),
            update: vi.fn((updates: any) => ({
              or: vi.fn((expr: string) => {
                requestsStore = requestsStore.map(r => 
                  expr.includes(r.email) || expr.includes(r.id) ? { ...r, ...updates } : r
                );
                return { data: updates, error: null };
              }),
              eq: vi.fn((field: string, val: any) => {
                requestsStore = requestsStore.map(r => 
                  r[field] === val ? { ...r, ...updates } : r
                );
                return { data: updates, error: null };
              }),
            })),
          };
        }

        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((field: string, val: any) => ({
                maybeSingle: vi.fn(() => ({
                  data: usersStore.find(u => u[field] === val) || null,
                  error: null,
                })),
                data: usersStore.filter(u => u[field] === val),
                error: null,
              })),
              or: vi.fn((expr: string) => ({
                maybeSingle: vi.fn(() => {
                  const match = usersStore.find(u => 
                    expr.includes(u.email) || expr.includes(u.id)
                  );
                  return { data: match || null, error: null };
                }),
                data: usersStore.filter(u => !u.is_active || u.approval_status === 'pending'),
                error: null,
              })),
            })),
            insert: vi.fn((row: any) => {
              const saved = { id: row.id || `u-${Date.now()}`, ...row };
              usersStore.push(saved);
              return {
                select: vi.fn(() => ({
                  single: vi.fn(() => ({ data: saved, error: null })),
                })),
              };
            }),
            update: vi.fn((updates: any) => ({
              eq: vi.fn((field: string, val: any) => {
                usersStore = usersStore.map(u => 
                  u[field] === val ? { ...u, ...updates } : u
                );
                return {
                  select: vi.fn(() => ({
                    single: vi.fn(() => ({
                      data: usersStore.find(u => u[field] === val),
                      error: null,
                    })),
                  })),
                };
              }),
              or: vi.fn((expr: string) => {
                usersStore = usersStore.map(u => 
                  expr.includes(u.email) || expr.includes(u.id) ? { ...u, ...updates } : u
                );
                return { data: updates, error: null };
              }),
            })),
          };
        }

        if (table === 'audit_history') {
          return {
            insert: vi.fn((entry: any) => {
              auditLogsStore.push(entry);
              return { data: entry, error: null };
            }),
          };
        }

        if (table === 'course_offerings' || table === 'profiles') {
          return {
            select: vi.fn(() => ({
              not: vi.fn(() => ({ data: [], error: null })),
            })),
          };
        }

        return {
          select: vi.fn(() => ({ data: [], error: null })),
        };
      }),
      rpc: vi.fn((fnName: string, args: any) => {
        if (fnName === 'approve_user') {
          const email = args.target_identifier.toLowerCase().trim();
          const role = args.role_override || 'student';
          const match = requestsStore.find(r => r.email === email);
          if (match) {
            match.status = 'approved';
            match.approved_role = role;
          }
          const userMatch = usersStore.find(u => u.email === email);
          if (userMatch) {
            userMatch.is_active = true;
            userMatch.role = role;
            userMatch.approval_status = 'approved';
          }
          return { data: { success: true, email, role, status: 'approved' }, error: null };
        }
        if (fnName === 'reject_user') {
          const email = args.target_identifier.toLowerCase().trim();
          const match = requestsStore.find(r => r.email === email);
          if (match) {
            match.status = 'rejected';
            match.rejection_reason = args.reason_text;
          }
          return { data: { success: true, email, status: 'rejected' }, error: null };
        }
        return { data: null, error: null };
      }),
    };

    setServerSupabaseClient(mockSupabase);
  });

  afterEach(() => {
    setServerSupabaseClient(null);
    vi.clearAllMocks();
  });

  describe('1. In-App Setup: Multi-Role Account Registration', () => {
    it('registers a student account in pending approval status', async () => {
      const res = await registerAccountRequestInDatabase({
        email: 'timothy.student@som.hteim.org',
        name: 'Timothy Student',
        requestedRole: 'student',
        details: { cohortLevel: 'Level 1 Foundation', studentNumber: 'SOM-2026-101' },
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('pending');

      const status = await getAccountApprovalStatus('timothy.student@som.hteim.org');
      expect(status.exists).toBe(true);
      expect(status.status).toBe('pending');
      expect(status.requestedRole).toBe('student');
    });

    it('registers a teacher account in pending approval status', async () => {
      const res = await registerAccountRequestInDatabase({
        email: 'priscilla.teacher@som.hteim.org',
        name: 'Priscilla Teacher',
        requestedRole: 'teacher',
        details: { department: 'School of the Apostles' },
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('pending');

      const status = await getAccountApprovalStatus('priscilla.teacher@som.hteim.org');
      expect(status.status).toBe('pending');
      expect(status.requestedRole).toBe('teacher');
    });

    it('registers an admin account in pending approval status', async () => {
      const res = await registerAccountRequestInDatabase({
        email: 'barnabas.admin@som.hteim.org',
        name: 'Barnabas Admin',
        requestedRole: 'admin',
        details: { reason: 'Academic Affairs Coordination' },
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('pending');

      const status = await getAccountApprovalStatus('barnabas.admin@som.hteim.org');
      expect(status.status).toBe('pending');
      expect(status.requestedRole).toBe('admin');
    });

    it('registers a superadmin account in pending approval status', async () => {
      const res = await registerAccountRequestInDatabase({
        email: 'silas.super@som.hteim.org',
        name: 'Silas SuperAdmin',
        requestedRole: 'superadmin',
        details: { reason: 'Executive oversight' },
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('pending');

      const status = await getAccountApprovalStatus('silas.super@som.hteim.org');
      expect(status.status).toBe('pending');
      expect(status.requestedRole).toBe('super_admin');
    });

    it('auto-approves default executive super admin (kpierre24@gmail.com)', async () => {
      const res = await registerAccountRequestInDatabase({
        email: 'kpierre24@gmail.com',
        name: 'Kendell Pierre',
        requestedRole: 'admin',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('approved');

      const status = await getAccountApprovalStatus('kpierre24@gmail.com');
      expect(status.status).toBe('approved');
      expect(status.role).toBe('super_admin');
    });
  });

  describe('2. Supabase Approval Workflow', () => {
    beforeEach(async () => {
      // Seed pending accounts
      await registerAccountRequestInDatabase({
        email: 'john.mark@som.hteim.org',
        name: 'John Mark',
        requestedRole: 'teacher',
        details: { department: 'Ministerial Ethics' },
      });

      await registerAccountRequestInDatabase({
        email: 'lydia.student@som.hteim.org',
        name: 'Lydia Student',
        requestedRole: 'student',
      });
    });

    it('lists pending accounts in getPendingAccountApprovals', async () => {
      const pending = await getPendingAccountApprovals();
      expect(pending.length).toBeGreaterThanOrEqual(2);
      expect(pending.some(p => p.email === 'john.mark@som.hteim.org')).toBe(true);
      expect(pending.some(p => p.email === 'lydia.student@som.hteim.org')).toBe(true);
    });

    it('approves a teacher account and activates permissions', async () => {
      const approval = await approveAccountRequestInDatabase({
        targetIdentifier: 'john.mark@som.hteim.org',
        roleOverride: 'teacher',
        actorUserId: 'admin-actor-uuid',
        actorRole: 'super_admin',
        reason: 'Credentials verified by executive board',
      });

      expect(approval.success).toBe(true);

      const status = await getAccountApprovalStatus('john.mark@som.hteim.org');
      expect(status.status).toBe('approved');
      expect(status.role).toBe('teacher');
    });

    it('approves a student account with elevated or customized role override', async () => {
      const approval = await approveAccountRequestInDatabase({
        targetIdentifier: 'lydia.student@som.hteim.org',
        roleOverride: 'admin',
        actorUserId: 'admin-actor-uuid',
        actorRole: 'super_admin',
        reason: 'Granted administrative assignment',
      });

      expect(approval.success).toBe(true);

      const status = await getAccountApprovalStatus('lydia.student@som.hteim.org');
      expect(status.status).toBe('approved');
      expect(status.role).toBe('admin');
    });

    it('rejects an unauthorized application with audit reason', async () => {
      await registerAccountRequestInDatabase({
        email: 'bogus.applicant@som.hteim.org',
        name: 'Bogus Applicant',
        requestedRole: 'superadmin',
      });

      const rejection = await rejectAccountRequestInDatabase({
        targetIdentifier: 'bogus.applicant@som.hteim.org',
        reason: 'Invalid ministry credentials',
        actorUserId: 'admin-actor-uuid',
        actorRole: 'super_admin',
      });

      expect(rejection.success).toBe(true);

      const status = await getAccountApprovalStatus('bogus.applicant@som.hteim.org');
      expect(status.status).toBe('rejected');
      expect(status.reason).toBe('Invalid ministry credentials');
    });
  });
});
