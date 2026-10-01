import { describe, it, expect, vi, beforeEach } from 'vitest';
import { studentsService } from '../server/services/domain/studentsService';
import * as supabaseServer from '../server/services/supabaseServer';
import { AuthenticatedUser } from '../types/rbac';

describe('studentsService.getStudents - Database-Level Filtering Optimization', () => {
  const studentUser: AuthenticatedUser = {
    uid: 'firebase-student-123',
    userId: 'b1111111-1111-4111-8111-111111111111',
    id: 'b1111111-1111-4111-8111-111111111111',
    studentRecordId: 'a2222222-2222-4222-8222-222222222222',
    studentNumber: 'SOM-2026-001',
    email: 'student@som.hteim.org',
    name: 'Alice Smith',
    role: 'student',
    permissions: ['attendance:read', 'grades:read'],
  };

  const adminUser: AuthenticatedUser = {
    uid: 'firebase-admin-123',
    userId: 'c3333333-3333-4333-8333-333333333333',
    id: 'c3333333-3333-4333-8333-333333333333',
    email: 'admin@som.hteim.org',
    name: 'Admin User',
    role: 'admin',
    permissions: ['all:access', 'students:read'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pushes down student filtering to PostgreSQL so only the requesting student record is queried', async () => {
    const studentQueryCalls: { method: string; args: any[] }[] = [];
    const attendanceQueryCalls: { method: string; args: any[] }[] = [];
    const submissionsQueryCalls: { method: string; args: any[] }[] = [];

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'students') {
          const chain: any = {
            select: vi.fn((...args) => {
              studentQueryCalls.push({ method: 'select', args });
              return chain;
            }),
            is: vi.fn((...args) => {
              studentQueryCalls.push({ method: 'is', args });
              return chain;
            }),
            or: vi.fn((...args) => {
              studentQueryCalls.push({ method: 'or', args });
              return chain;
            }),
            eq: vi.fn((...args) => {
              studentQueryCalls.push({ method: 'eq', args });
              return chain;
            }),
            order: vi.fn((...args) => {
              studentQueryCalls.push({ method: 'order', args });
              return Promise.resolve({
                data: [
                  {
                    id: studentUser.studentRecordId,
                    user_id: studentUser.userId,
                    student_number: studentUser.studentNumber,
                    enrollment_status: 'active',
                    cohort_level: 'Level 1 Foundation',
                    admission_date: '2026-01-15',
                    profiles: {
                      first_name: 'Alice',
                      last_name: 'Smith',
                      avatar_url: null,
                      bio: 'Faithful student',
                      phone: '555-0101',
                    },
                    users: {
                      email: studentUser.email,
                      is_active: true,
                    },
                  },
                ],
                error: null,
              });
            }),
          };
          return chain;
        }

        if (table === 'attendance') {
          const chain: any = {
            select: vi.fn((...args) => {
              attendanceQueryCalls.push({ method: 'select', args });
              return chain;
            }),
            is: vi.fn((...args) => {
              attendanceQueryCalls.push({ method: 'is', args });
              return chain;
            }),
            in: vi.fn((...args) => {
              attendanceQueryCalls.push({ method: 'in', args });
              return Promise.resolve({
                data: [
                  {
                    student_id: studentUser.studentRecordId,
                    session_date: '2026-09-01',
                    status: 'present',
                  },
                ],
                error: null,
              });
            }),
          };
          return chain;
        }

        if (table === 'submissions') {
          const chain: any = {
            select: vi.fn((...args) => {
              submissionsQueryCalls.push({ method: 'select', args });
              return chain;
            }),
            is: vi.fn((...args) => {
              submissionsQueryCalls.push({ method: 'is', args });
              return chain;
            }),
            in: vi.fn((...args) => {
              submissionsQueryCalls.push({ method: 'in', args });
              return Promise.resolve({
                data: [
                  {
                    id: 'sub-1',
                    student_id: studentUser.studentRecordId,
                    status: 'graded',
                    grades: { points_awarded: 95 },
                  },
                ],
                error: null,
              });
            }),
          };
          return chain;
        }

        if (table === 'attendance_sessions') {
          const chain: any = {
            select: vi.fn().mockReturnThis(),
            is: vi.fn().mockResolvedValue({
              data: [
                { session_date: '2026-09-01' },
                { session_date: '2026-09-08' },
              ],
              error: null,
            }),
          };
          return chain;
        }

        return {} as any;
      }),
    };

    vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase as any);

    const result = await studentsService.getStudents(studentUser);

    // Verify student query performed database filtering using id OR user_id
    const hasOrFilter = studentQueryCalls.some(
      (c) => c.method === 'or' && c.args[0].includes(studentUser.studentRecordId)
    );
    expect(hasOrFilter).toBe(true);

    // Verify attendance query filtered by student_id at the DB level using .in()
    expect(attendanceQueryCalls.some((c) => c.method === 'in')).toBe(true);
    const attInCall = attendanceQueryCalls.find((c) => c.method === 'in');
    expect(attInCall?.args).toEqual(['student_id', [studentUser.studentRecordId]]);

    // Verify submissions query filtered by student_id at the DB level using .in()
    expect(submissionsQueryCalls.some((c) => c.method === 'in')).toBe(true);
    const subInCall = submissionsQueryCalls.find((c) => c.method === 'in');
    expect(subInCall?.args).toEqual(['student_id', [studentUser.studentRecordId]]);

    // Verify final result returned contains solely the authenticated student
    expect(result.students).toHaveLength(1);
    expect(result.students[0].id).toBe(studentUser.studentRecordId);
    expect(result.students[0].name).toBe('Alice Smith');
    expect(result.total).toBe(1);
  });

  it('returns empty result immediately without querying attendance/submissions if student has no record in database', async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'students') {
          return {
            select: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
        return {} as any;
      }),
    };

    vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase as any);

    const result = await studentsService.getStudents(studentUser);

    expect(result.students).toHaveLength(0);
    expect(result.total).toBe(0);
    // Verified: neither attendance nor submissions tables were touched
    expect(mockSupabase.from).toHaveBeenCalledWith('students');
    expect(mockSupabase.from).not.toHaveBeenCalledWith('attendance');
    expect(mockSupabase.from).not.toHaveBeenCalledWith('submissions');
  });

  it('allows staff to query with database pagination and filters without loading all records', async () => {
    const staffQueryCalls: { method: string; args: any[] }[] = [];

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'students') {
          const chain: any = {
            select: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            eq: vi.fn((...args) => {
              staffQueryCalls.push({ method: 'eq', args });
              return chain;
            }),
            or: vi.fn((...args) => {
              staffQueryCalls.push({ method: 'or', args });
              return chain;
            }),
            range: vi.fn((...args) => {
              staffQueryCalls.push({ method: 'range', args });
              return chain;
            }),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'std-uuid-10',
                  user_id: 'usr-uuid-10',
                  student_number: 'SOM-2026-010',
                  enrollment_status: 'active',
                  cohort_level: 'Level 2 Diploma',
                  admission_date: '2026-01-15',
                  profiles: { first_name: 'Bob', last_name: 'Jones' },
                  users: { email: 'bob@som.hteim.org' },
                },
              ],
              error: null,
            }),
          };
          return chain;
        }

        if (table === 'attendance' || table === 'submissions') {
          return {
            select: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }

        return {} as any;
      }),
    };

    vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase as any);

    const result = await studentsService.getStudents(adminUser, {
      cohortLevel: 'Level 2 Diploma',
      limit: 25,
      offset: 50,
      search: 'SOM-2026',
    });

    // Verify eq('cohort_level', 'Level 2 Diploma') was applied
    expect(staffQueryCalls.some((c) => c.method === 'eq' && c.args[0] === 'cohort_level' && c.args[1] === 'Level 2 Diploma')).toBe(true);

    // Verify range(50, 74) was applied
    expect(staffQueryCalls.some((c) => c.method === 'range' && c.args[0] === 50 && c.args[1] === 74)).toBe(true);

    // Verify search was applied
    expect(staffQueryCalls.some((c) => c.method === 'or' && c.args[0].includes('SOM-2026'))).toBe(true);

    expect(result.students).toHaveLength(1);
    expect(result.students[0].name).toBe('Bob Jones');
  });
});
