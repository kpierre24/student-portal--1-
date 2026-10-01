import { describe, it, expect, vi, beforeEach } from 'vitest';
import { studentsService } from '../server/services/domain/studentsService';
import * as supabaseServer from '../server/services/supabaseServer';
import { AuthenticatedUser } from '../types/rbac';

describe('Academic Defaults & Data Integrity', () => {
  const adminUser: AuthenticatedUser = {
    uid: 'firebase-admin-123',
    userId: 'c3333333-3333-4333-8333-333333333333',
    id: 'c3333333-3333-4333-8333-333333333333',
    email: 'admin@som.hteim.org',
    name: 'Admin User',
    role: 'admin',
    permissions: ['all:access', 'students:read', 'grades:read'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createQueryChain(resolveValue: any) {
    const chain: any = {
      select: vi.fn(() => chain),
      is: vi.fn(() => chain),
      in: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      or: vi.fn(() => chain),
      order: vi.fn(() => chain),
      range: vi.fn(() => chain),
      ilike: vi.fn(() => chain),
      maybeSingle: vi.fn(() => Promise.resolve(resolveValue)),
      then: (onfulfilled: any, onrejected: any) => Promise.resolve(resolveValue).then(onfulfilled, onrejected),
    };
    return chain;
  }

  it('studentsService.getStudents sets averageGrade to null and standing to "Not Yet Graded" when student has no grades', async () => {
    const studentAId = 'a1111111-1111-4111-8111-111111111111'; // Ungraded student
    const studentBId = 'b2222222-2222-4222-8222-222222222222'; // Graded student (92%)

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'students') {
          return createQueryChain({
            data: [
              {
                id: studentAId,
                student_number: 'SOM-001',
                cohort_level: 'Level 1 Foundation',
                enrollment_status: 'active',
                profiles: [{ first_name: 'John', last_name: 'Doe' }],
                users: [{ email: 'john@example.com' }],
              },
              {
                id: studentBId,
                student_number: 'SOM-002',
                cohort_level: 'Level 1 Foundation',
                enrollment_status: 'active',
                profiles: [{ first_name: 'Jane', last_name: 'Smith' }],
                users: [{ email: 'jane@example.com' }],
              },
            ],
            error: null,
          });
        }

        if (table === 'attendance') {
          return createQueryChain({
            data: [
              { student_id: studentAId, status: 'present', session_date: '2026-09-01' },
              { student_id: studentBId, status: 'present', session_date: '2026-09-01' },
            ],
            error: null,
          });
        }

        if (table === 'submissions') {
          return createQueryChain({
            data: [
              // Only Jane (studentB) has a graded submission
              {
                student_id: studentBId,
                grades: [{ points_awarded: 92 }],
              },
            ],
            error: null,
          });
        }

        return createQueryChain({ data: [], error: null });
      }),
    };

    vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase as any);

    const result = await studentsService.getStudents(adminUser);
    expect(result.students).toHaveLength(2);

    const studentA = result.students.find((s) => s.id === studentAId);
    expect(studentA).toBeDefined();
    // Student with no grades must have averageGrade: null and standing: "Not Yet Graded"
    expect(studentA!.averageGrade).toBeNull();
    expect(studentA!.standing).toBe('Not Yet Graded');

    const studentB = result.students.find((s) => s.id === studentBId);
    expect(studentB).toBeDefined();
    // Graded student has real calculated average
    expect(studentB!.averageGrade).toBe(92);
    expect(studentB!.standing).toBe('High Distinction');
  });

  it('studentsService.getStudentByNameOrId sets averageGrade to null and standing to "Not Yet Graded" when student has no grades', async () => {
    const studentId = 'a1111111-1111-4111-8111-111111111111';

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'students') {
          return createQueryChain({
            data: {
              id: studentId,
              student_number: 'SOM-001',
              cohort_level: 'Level 1 Foundation',
              profiles: { first_name: 'John', last_name: 'Doe' },
              users: { email: 'john@example.com' },
            },
            error: null,
          });
        }

        if (table === 'attendance') {
          return createQueryChain({
            data: [{ student_id: studentId, status: 'present' }],
            error: null,
          });
        }

        if (table === 'submissions') {
          return createQueryChain({
            data: [
              // Submission with no grade awarded yet
              {
                id: 'sub-1',
                student_id: studentId,
                grades: [],
              },
            ],
            error: null,
          });
        }

        return createQueryChain({ data: [], error: null });
      }),
    };

    vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase as any);

    const result = await studentsService.getStudentByNameOrId(studentId, adminUser);
    expect(result).not.toBeNull();
    expect(result!.student.averageGrade).toBeNull();
    expect(result!.student.standing).toBe('Not Yet Graded');
  });
});
