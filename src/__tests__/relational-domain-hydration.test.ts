import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stateHydrationService } from '../server/services/domain/stateHydrationService';
import { studentsService } from '../server/services/domain/studentsService';
import { attendanceService } from '../server/services/domain/attendanceService';
import { academicsService } from '../server/services/domain/academicsService';
import { assignmentsService } from '../server/services/domain/assignmentsService';
import { financeService } from '../server/services/domain/financeService';
import * as supabaseServer from '../server/services/supabaseServer';
import { AuthenticatedUser } from '../types/rbac';

describe('stateHydrationService - Pure Relational Domain Architecture', () => {
  const adminUser: AuthenticatedUser = {
    uid: 'firebase-admin-1',
    userId: 'a0000000-0000-4000-8000-000000000001',
    id: 'a0000000-0000-4000-8000-000000000001',
    email: 'admin@som.hteim.org',
    name: 'Administrator',
    role: 'admin',
    permissions: ['all:access'],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should compose application state by querying domain services in parallel without legacy JSON state', async () => {
    // Spy on domain services
    vi.spyOn(studentsService, 'getStudents').mockResolvedValue({
      students: [
        { id: 'stu-1', name: 'John Doe', level: 'Level 1 Foundation', studentNumber: 'SOM-2026-0100', email: 'john@student.hteim.org', note: 'Active student' } as any
      ],
      total: 1,
    });

    vi.spyOn(attendanceService, 'getAttendance').mockResolvedValue({
      records: [
        { id: 'att-1', studentName: 'John Doe', classDay: '2026-09-01', present: true } as any
      ],
      classDays: [{ id: 'cd-1', name: 'Week 1', date: '2026-09-01' }],
      excusedAbsences: {},
    });

    vi.spyOn(academicsService, 'getAcademicStructure').mockResolvedValue({
      academicYears: [{ id: 'ay-1', name: '2026-2027', code: 'AY-2026' }] as any,
      terms: [{ id: 'term-1', name: 'Semester 1', code: 'SEM-1' }] as any,
      activeTermId: 'term-1',
      masterCourses: [{ id: 'mc-1', code: 'MIN-101', title: 'Biblical Foundations' }] as any,
      courseOfferings: [{ id: 'co-1', course_definition_id: 'mc-1' }] as any,
    });

    vi.spyOn(academicsService, 'getCourses').mockResolvedValue({
      courses: [{ id: 'mc-1', code: 'MIN-101', name: 'Biblical Foundations' }] as any,
      total: 1,
    });

    vi.spyOn(assignmentsService, 'getAssignments').mockResolvedValue({
      assignments: [{ id: 'asg-1', title: 'Essay 1', courseCode: 'MIN-101' }] as any,
      total: 1,
    });

    vi.spyOn(assignmentsService, 'getSubmissions').mockResolvedValue({
      submissions: [{ id: 'sub-1', assignmentId: 'asg-1', studentName: 'John Doe', score: 95 }] as any,
      rubricScores: {},
      total: 1,
    });

    vi.spyOn(financeService, 'getInvoices').mockResolvedValue({
      invoices: [{ id: 'inv-1', invoiceNumber: 'INV-001', amount: 500, balance: 0 }] as any,
      total: 1,
    });

    vi.spyOn(financeService, 'getTransactions').mockResolvedValue({
      transactions: [{ id: 'tx-1', referenceNumber: 'TX-001', amount: 500 }] as any,
      total: 1,
    });

    const isSeededSpy = vi.spyOn(stateHydrationService, 'ensureRelationalDataSeeded').mockResolvedValue();

    const composed = await stateHydrationService.getComposedStateForUser(adminUser);

    expect(isSeededSpy).toHaveBeenCalled();
    expect(studentsService.getStudents).toHaveBeenCalledWith(adminUser);
    expect(attendanceService.getAttendance).toHaveBeenCalledWith(adminUser);
    expect(academicsService.getAcademicStructure).toHaveBeenCalled();
    expect(assignmentsService.getAssignments).toHaveBeenCalledWith(adminUser);
    expect(financeService.getInvoices).toHaveBeenCalled();

    // Verify composed structure
    expect(composed.isRelationalAuthoritative).toBe(true);
    expect(composed.students).toHaveLength(1);
    expect(composed.students[0].name).toBe('John Doe');
    expect(composed.records).toHaveLength(1);
    expect(composed.studentLevels['John Doe']).toBe('Level 1 Foundation');
    expect(composed.studentNotes['John Doe']).toBe('Active student');
    expect(composed.customAssignments).toHaveLength(1);
    expect(composed.submissions).toHaveLength(1);
    expect(composed.invoices).toHaveLength(1);
  });

  it('should deterministically seed relational database without reading legacy app_states blob', async () => {
    const mockUpsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'ay-1' } }) }) });
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'students') {
          return {
            select: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [] }), // unseeded
            upsert: mockUpsert,
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          upsert: mockUpsert,
          single: vi.fn().mockResolvedValue({ data: { id: 'test-id' } }),
        };
      }),
    };

    vi.spyOn(supabaseServer, 'isSupabaseConfigured').mockReturnValue(true);
    vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase as any);

    await stateHydrationService.ensureRelationalDataSeeded();

    // Verify tables seeded: academic_years, terms, course_definitions, users, profiles, students
    expect(mockSupabase.from).toHaveBeenCalledWith('academic_years');
    expect(mockSupabase.from).toHaveBeenCalledWith('terms');
    expect(mockSupabase.from).toHaveBeenCalledWith('course_definitions');
    expect(mockSupabase.from).toHaveBeenCalledWith('users');
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    expect(mockSupabase.from).toHaveBeenCalledWith('students');

    // app_states should NOT be queried
    expect(mockSupabase.from).not.toHaveBeenCalledWith('app_states');
  });
});
