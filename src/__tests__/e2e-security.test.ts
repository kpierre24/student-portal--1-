import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app';
import * as supabaseServer from '../server/services/supabaseServer';

// Mock logger to avoid test log pollution
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock relational data store
const MOCK_DATA = {
  users: [
    {
      id: '11111111-aaaa-4111-8111-111111111111',
      firebase_uid: 'student-a-uid',
      email: 'student.a@som.hteim.org',
      role: 'student',
      is_active: true,
      deleted_at: null,
    },
    {
      id: '22222222-bbbb-4222-8222-222222222222',
      firebase_uid: 'student-b-uid',
      email: 'student.b@som.hteim.org',
      role: 'student',
      is_active: true,
      deleted_at: null,
    },
    {
      id: '33333333-cccc-4333-8333-333333333333',
      firebase_uid: 'lecturer-a-uid',
      email: 'lecturer.a@som.hteim.org',
      role: 'lecturer',
      is_active: true,
      deleted_at: null,
    },
    {
      id: '44444444-dddd-4444-8444-444444444444',
      firebase_uid: 'lecturer-b-uid',
      email: 'lecturer.b@som.hteim.org',
      role: 'lecturer',
      is_active: true,
      deleted_at: null,
    },
    {
      id: '55555555-eeee-4555-8555-555555555555',
      firebase_uid: 'registrar-uid',
      email: 'registrar@som.hteim.org',
      role: 'registrar',
      is_active: true,
      deleted_at: null,
    },
    {
      id: '66666666-ffff-4666-8666-666666666666',
      firebase_uid: 'super-admin-uid',
      email: 'admin@som.hteim.org',
      role: 'super_admin',
      is_active: true,
      deleted_at: null,
    },
  ],
  profiles: [
    {
      id: 'prof-a',
      user_id: '11111111-aaaa-4111-8111-111111111111',
      first_name: 'Student',
      last_name: 'A',
      email: 'student.a@som.hteim.org',
      role: 'student',
      students: [{ id: 'aaaa1111-1111-4111-8111-111111111111', student_number: 'SOM-STU-001' }],
    },
    {
      id: 'prof-b',
      user_id: '22222222-bbbb-4222-8222-222222222222',
      first_name: 'Student',
      last_name: 'B',
      email: 'student.b@som.hteim.org',
      role: 'student',
      students: [{ id: 'bbbb2222-2222-4222-8222-222222222222', student_number: 'SOM-STU-002' }],
    },
    {
      id: 'prof-lec-a',
      user_id: '33333333-cccc-4333-8333-333333333333',
      first_name: 'Lecturer',
      last_name: 'A',
      email: 'lecturer.a@som.hteim.org',
      role: 'lecturer',
    },
    {
      id: 'prof-lec-b',
      user_id: '44444444-dddd-4444-8444-444444444444',
      first_name: 'Lecturer',
      last_name: 'B',
      email: 'lecturer.b@som.hteim.org',
      role: 'lecturer',
    },
  ],
  students: [
    {
      id: 'aaaa1111-1111-4111-8111-111111111111',
      user_id: '11111111-aaaa-4111-8111-111111111111',
      student_number: 'SOM-STU-001',
      cohort_level: 'Certificate',
      profiles: { first_name: 'Student', last_name: 'A' },
      users: { email: 'student.a@som.hteim.org' },
    },
    {
      id: 'bbbb2222-2222-4222-8222-222222222222',
      user_id: '22222222-bbbb-4222-8222-222222222222',
      student_number: 'SOM-STU-002',
      cohort_level: 'Diploma',
      profiles: { first_name: 'Student', last_name: 'B' },
      users: { email: 'student.b@som.hteim.org' },
    },
  ],
  course_definitions: [
    {
      id: 'c001-lead-101',
      code: 'SOM-LEAD-101',
      title: 'Christian Leadership Foundations',
      deleted_at: null,
    },
    {
      id: 'c002-bibl-201',
      code: 'SOM-BIBL-201',
      title: 'Hermeneutics & Exegesis',
      deleted_at: null,
    },
  ],
  course_offerings: [
    {
      id: 'off-001',
      course_definition_id: 'c001-lead-101',
      lecturer_user_id: '33333333-cccc-4333-8333-333333333333', // Lecturer A
      course_definitions: { id: 'c001-lead-101', code: 'SOM-LEAD-101' },
      deleted_at: null,
    },
    {
      id: 'off-002',
      course_definition_id: 'c002-bibl-201',
      lecturer_user_id: '44444444-dddd-4444-8444-444444444444', // Lecturer B
      course_definitions: { id: 'c002-bibl-201', code: 'SOM-BIBL-201' },
      deleted_at: null,
    },
  ],
  invoices: [
    {
      id: 'inv-a-1',
      invoice_number: 'INV-2026-000001',
      student_id: 'aaaa1111-1111-4111-8111-111111111111', // Student A
      total_amount: 500,
      net_amount: 500,
      paid_amount: 0,
      balance_due: 500,
      status: 'unpaid',
      created_at: '2026-01-15T00:00:00Z',
      due_date: '2026-06-30T00:00:00Z',
      deleted_at: null,
    },
    {
      id: 'inv-b-1',
      invoice_number: 'INV-2026-000002',
      student_id: 'bbbb2222-2222-4222-8222-222222222222', // Student B
      total_amount: 750,
      net_amount: 750,
      paid_amount: 0,
      balance_due: 750,
      status: 'unpaid',
      created_at: '2026-01-15T00:00:00Z',
      due_date: '2026-06-30T00:00:00Z',
      deleted_at: null,
    },
  ],
  invoice_lines: [
    { id: 'inl-1', invoice_id: 'inv-a-1', description: 'Tuition', total_amount: 500 },
    { id: 'inl-2', invoice_id: 'inv-b-1', description: 'Tuition', total_amount: 750 },
  ],
  assignments: [
    {
      id: 'asg-lead-1',
      title: 'Leadership Strategy Paper',
      course_code: 'SOM-LEAD-101',
      course_definition_id: 'c001-lead-101',
      max_points: 100,
      is_published: true,
      deleted_at: null,
    },
    {
      id: 'asg-bibl-1',
      title: 'Biblical Exegesis Paper',
      course_code: 'SOM-BIBL-201',
      course_definition_id: 'c002-bibl-201',
      max_points: 100,
      is_published: true,
      deleted_at: null,
    },
  ],
  submissions: [
    {
      id: 'sub-lead-a',
      assignment_id: 'asg-lead-1',
      student_id: 'aaaa1111-1111-4111-8111-111111111111',
      status: 'submitted',
      submitted_at: '2026-02-01T12:00:00Z',
      submission_content: 'My Leadership Paper Content',
      deleted_at: null,
      assignments: {
        id: 'asg-lead-1',
        title: 'Leadership Strategy Paper',
        course_code: 'SOM-LEAD-101',
        max_points: 100,
      },
      grades: null,
    },
    {
      id: 'sub-bibl-b',
      assignment_id: 'asg-bibl-1',
      student_id: 'bbbb2222-2222-4222-8222-222222222222',
      status: 'submitted',
      submitted_at: '2026-02-01T12:00:00Z',
      submission_content: 'My Exegesis Paper Content',
      deleted_at: null,
      assignments: {
        id: 'asg-bibl-1',
        title: 'Biblical Exegesis Paper',
        course_code: 'SOM-BIBL-201',
        max_points: 100,
      },
      grades: null,
    },
    {
      id: 'sub-locked-1',
      assignment_id: 'asg-lead-1',
      student_id: 'aaaa1111-1111-4111-8111-111111111111',
      status: 'LOCKED',
      submitted_at: '2026-01-20T12:00:00Z',
      submission_content: 'Locked Final Exam',
      deleted_at: null,
      assignments: {
        id: 'asg-lead-1',
        title: 'Leadership Strategy Paper',
        course_code: 'SOM-LEAD-101',
        max_points: 100,
      },
      grades: { points_awarded: 80, feedback: 'Original final grade' },
    },
  ],
  grades: [] as any[],
  audit_logs: [] as any[],
  audit_history: [] as any[],
};

function setupMockDatabase() {
  const mockSupabase = {
    from: vi.fn((table: string) => {
      const builder: any = {
        _table: table,
        _filters: [] as ((item: any) => boolean)[],
        _limit: undefined as number | undefined,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((col: string, val: any) => {
          builder._filters.push((item: any) => item[col] === val);
          return builder;
        }),
        neq: vi.fn((col: string, val: any) => {
          builder._filters.push((item: any) => item[col] !== val);
          return builder;
        }),
        is: vi.fn((col: string, val: any) => {
          builder._filters.push((item: any) => (item[col] ?? null) === val);
          return builder;
        }),
        in: vi.fn((col: string, vals: any[]) => {
          builder._filters.push((item: any) => vals.includes(item[col]));
          return builder;
        }),
        ilike: vi.fn((col: string, val: string) => {
          const clean = val.toLowerCase().replace(/%/g, '');
          builder._filters.push((item: any) => String(item[col] || '').toLowerCase().includes(clean));
          return builder;
        }),
        or: vi.fn((clause: string) => {
          // Parse simple or queries like "id.eq.X,invoice_number.eq.X"
          const parts = clause.split(',');
          builder._filters.push((item: any) => {
            return parts.some((p) => {
              const [col, op, val] = p.split('.');
              if (op === 'eq') return String(item[col] || '').toLowerCase() === String(val || '').toLowerCase();
              return false;
            });
          });
          return builder;
        }),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn((n: number) => {
          builder._limit = n;
          return builder;
        }),
        upsert: vi.fn((payload: any) => {
          const list = (MOCK_DATA as any)[table] || [];
          const idx = list.findIndex((i: any) => i.id === payload.id || (payload.submission_id && i.submission_id === payload.submission_id));
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...payload };
          } else {
            list.push(payload);
          }
          return Promise.resolve({
            select: () => ({
              single: () => Promise.resolve({ data: payload, error: null }),
            }),
            data: payload,
            error: null,
          });
        }),
        insert: vi.fn((payload: any) => {
          const list = (MOCK_DATA as any)[table] || [];
          if (Array.isArray(payload)) {
            list.push(...payload);
          } else {
            list.push(payload);
          }
          return Promise.resolve({ data: payload, error: null });
        }),
        update: vi.fn((payload: any) => {
          return {
            eq: vi.fn((col: string, val: any) => {
              const list = (MOCK_DATA as any)[table] || [];
              list.forEach((item: any) => {
                if (item[col] === val) {
                  Object.assign(item, payload);
                }
              });
              return Promise.resolve({
                data: payload,
                error: null,
                is: vi.fn().mockReturnValue(Promise.resolve({ data: payload, error: null })),
              });
            }),
          };
        }),
        maybeSingle: vi.fn(async () => {
          const list = (MOCK_DATA as any)[table] || [];
          let filtered = list;
          for (const f of builder._filters) {
            filtered = filtered.filter(f);
          }
          return { data: filtered[0] || null, error: null };
        }),
        single: vi.fn(async () => {
          const list = (MOCK_DATA as any)[table] || [];
          let filtered = list;
          for (const f of builder._filters) {
            filtered = filtered.filter(f);
          }
          return { data: filtered[0] || null, error: null };
        }),
        then: (resolve: any) => {
          const list = (MOCK_DATA as any)[table] || [];
          let filtered = list;
          for (const f of builder._filters) {
            filtered = filtered.filter(f);
          }
          if (builder._limit) {
            filtered = filtered.slice(0, builder._limit);
          }
          return Promise.resolve({ data: filtered, error: null }).then(resolve);
        },
      };
      return builder;
    }),
    rpc: vi.fn(async (fnName: string, args: any) => {
      if (fnName === 'get_next_document_number') {
        const prefix = (args?.p_type || 'INV').toUpperCase().slice(0, 3);
        return { data: `${prefix}-2026-000099`, error: null };
      }
      return { data: 'MOCK-RPC-RES', error: null };
    }),
  };

  vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase as any);
  supabaseServer.setServerSupabaseClient(mockSupabase as any);
}

describe('End-to-End Integration & Security Authorization Pipeline', () => {
  const app = createApp();

  // Test Tokens using the test-token:<uid>:<email>:<role> format verified by verifyIdToken()
  const studentAToken = 'Bearer test-token:student-a-uid:student.a@som.hteim.org:student';
  const studentBToken = 'Bearer test-token:student-b-uid:student.b@som.hteim.org:student';
  const lecturerAToken = 'Bearer test-token:lecturer-a-uid:lecturer.a@som.hteim.org:lecturer';
  const lecturerBToken = 'Bearer test-token:lecturer-b-uid:lecturer.b@som.hteim.org:lecturer';
  const registrarToken = 'Bearer test-token:registrar-uid:registrar@som.hteim.org:registrar';
  const superAdminToken = 'Bearer test-token:super-admin-uid:admin@som.hteim.org:super_admin';

  beforeEach(() => {
    setupMockDatabase();
  });

  describe('Scenario 1: Cross-Student Invoice Protection (Student A token + Student B invoice ID → 403)', () => {
    it('should return 403 Forbidden when Student A requests Student B invoice by ID', async () => {
      // Student A attempts to access Student B's invoice (inv-b-1)
      const res = await request(app)
        .get('/api/invoices/inv-b-1')
        .set('Authorization', studentAToken);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Access Denied/i);
      expect(res.body.code).toBe('RESOURCE_OWNERSHIP_DENIED');
    });

    it('should return 403 Forbidden when Student A attempts to filter invoices for Student B ID', async () => {
      // Student A attempts to query ?studentId=bbbb2222-2222-4222-8222-222222222222
      const res = await request(app)
        .get('/api/invoices?studentId=bbbb2222-2222-4222-8222-222222222222')
        .set('Authorization', studentAToken);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('RESOURCE_OWNERSHIP_DENIED');
    });

    it('should return 200 OK when Student A requests their own invoice', async () => {
      const res = await request(app)
        .get('/api/invoices/inv-a-1')
        .set('Authorization', studentAToken);

      expect(res.status).toBe(200);
      expect(res.body.invoice).toBeDefined();
      expect(res.body.invoice.id).toBe('inv-a-1');
    });
  });

  describe('Scenario 2: Cross-Lecturer Course Access (Lecturer A token + Lecturer B course → 403)', () => {
    it('should return 403 Forbidden when Lecturer A attempts to record grade for Lecturer B course', async () => {
      // Lecturer A is assigned to SOM-LEAD-101. Lecturer B is assigned to SOM-BIBL-201.
      // Lecturer A attempts to grade submission for SOM-BIBL-201.
      const res = await request(app)
        .post('/api/grades')
        .set('Authorization', lecturerAToken)
        .send({
          submissionId: 'sub-bibl-b',
          courseCode: 'SOM-BIBL-201',
          score: 92,
          feedback: 'Unauthorized grading attempt',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Access Denied/i);
      expect(res.body.code).toBe('LECTURER_COURSE_UNASSIGNED');
    });

    it('should return 403 Forbidden when Lecturer A attempts to checkin attendance for Lecturer B course', async () => {
      const res = await request(app)
        .post('/api/attendance/checkin')
        .set('Authorization', lecturerAToken)
        .send({
          courseCode: 'SOM-BIBL-201',
          studentName: 'Bob Student',
          studentId: 'bbbb2222-2222-4222-8222-222222222222',
          date: '2026-03-01',
          status: 'present',
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('LECTURER_COURSE_UNASSIGNED');
    });
  });

  describe('Scenario 3: Authorized Lecturer Course Grading (Lecturer A token + own course grade → 200)', () => {
    it('should return 200 OK when Lecturer A grades a submission for their assigned course (SOM-LEAD-101)', async () => {
      const res = await request(app)
        .post('/api/grades')
        .set('Authorization', lecturerAToken)
        .send({
          submissionId: 'sub-lead-a',
          courseCode: 'SOM-LEAD-101',
          score: 88,
          feedback: 'Excellent strategic theological synthesis.',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('GRADED');
      expect(res.body.score).toBe(88);
      expect(res.body.feedback).toBe('Excellent strategic theological synthesis.');
    });
  });

  describe('Scenario 4: Student Mutation Guard (Student token + POST grade → 403)', () => {
    it('should return 403 Forbidden when Student attempts to POST /api/grades', async () => {
      const res = await request(app)
        .post('/api/grades')
        .set('Authorization', studentAToken)
        .send({
          submissionId: 'sub-lead-a',
          score: 100,
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PERMISSION_DENIED');
    });

    it('should return 403 Forbidden when Student attempts to POST /api/assignments', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', studentAToken)
        .send({
          title: 'Hacked Assignment',
          courseCode: 'SOM-LEAD-101',
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PERMISSION_DENIED');
    });

    it('should return 403 Forbidden when Student attempts to create an invoice adjustment', async () => {
      const res = await request(app)
        .post('/api/invoices/adjustments')
        .set('Authorization', studentAToken)
        .send({
          adjustment: {
            invoiceId: 'inv-a-1',
            type: 'scholarship',
            amount: 500,
            reason: 'Self-awarded scholarship',
          },
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PERMISSION_DENIED');
    });
  });

  describe('Scenario 5: Mandatory Reason for Locked Grade Override (Registrar token + locked grade override without reason → 400)', () => {
    it('should return 400 Bad Request when Registrar attempts locked grade override without reason', async () => {
      const res = await request(app)
        .post('/api/grades/override')
        .set('Authorization', registrarToken)
        .send({
          submissionId: 'sub-locked-1',
          score: 95,
          // reason is intentionally omitted
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/reason are required/i);
    });

    it('should return 200 OK when Registrar supplies explicit audit reason for locked grade override', async () => {
      const res = await request(app)
        .post('/api/grades/override')
        .set('Authorization', registrarToken)
        .send({
          submissionId: 'sub-locked-1',
          score: 95,
          reason: 'Academic appeal officially approved by Academic Dean.',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('LOCKED');
      expect(res.body.score).toBe(95);
      expect(res.body.overrideApproved).toBe(true);
    });
  });

  describe('Scenario 6: Baseline Authentication & Role Verification', () => {
    it('should return 401 Unauthorized when request has no Authorization header', async () => {
      const res = await request(app).get('/api/grades');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('should allow Super Admin to access any course and audit logs', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', superAdminToken);

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
    });
  });
});
