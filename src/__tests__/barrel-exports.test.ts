import { describe, it, expect } from 'vitest';

// Barrel export imports using @/ alias
import {
  StudentsPage,
  StudentTable,
  useStudents,
  useStudent,
  useStudentMutations,
  computeStudentStats,
  type Student,
  type StudentFilterOptions,
} from '@/features/students';

import {
  AttendancePage,
  AttendanceWorkspace,
  useAttendance,
  useAttendanceMutations,
  type AttendanceRecord,
} from '@/features/attendance';

import {
  GradesPage,
  Gradebook,
  useGrades,
  useGradeMutations,
} from '@/features/grades';

import {
  AssignmentsPage,
  AssignmentList,
  useAssignments,
  useSubmissions,
} from '@/features/assignments';

import {
  FinancePage,
  FinancialSummary,
  useFinance,
  useInvoices,
  usePayments,
} from '@/features/finance';

import {
  Dashboard,
  StatCard,
  useDashboard,
} from '@/features/dashboard';

import {
  LibraryTab,
  useLibrary,
} from '@/features/library';

import {
  NotificationCenter,
  useNotifications,
} from '@/features/notifications';

import {
  ReportsPage,
  useReports,
} from '@/features/reports';

import {
  AcademicCalendarView,
  MasterCourseCatalogView,
} from '@/features/academics';

import {
  LoginModal,
  authService,
} from '@/features/auth';

import {
  ClassroomMediaPlayer,
} from '@/features/broadcasts';

import {
  ExamsTab,
  QuizTakerView,
} from '@/features/examinations';

import {
  ScheduleTab,
} from '@/features/schedule';

describe('Phase 20 — Barrel Exports & Public API (@/features/*)', () => {
  it('exports students feature components, hooks, utilities, and types cleanly via @/features/students', () => {
    expect(StudentsPage).toBeDefined();
    expect(StudentTable).toBeDefined();
    expect(useStudents).toBeDefined();
    expect(useStudent).toBeDefined();
    expect(useStudentMutations).toBeDefined();
    expect(computeStudentStats).toBeDefined();

    // Type check demonstration
    const studentSample: Partial<Student> = {
      id: 'stu-test',
      name: 'Grace Hopper',
      rate: 95,
    };
    expect(studentSample.name).toBe('Grace Hopper');

    const filterSample: Partial<StudentFilterOptions> = {
      searchQuery: 'grace',
      sortBy: 'name',
    };
    expect(filterSample.searchQuery).toBe('grace');
  });

  it('exports attendance feature components and hooks via @/features/attendance', () => {
    expect(AttendancePage).toBeDefined();
    expect(AttendanceWorkspace).toBeDefined();
    expect(useAttendance).toBeDefined();
    expect(useAttendanceMutations).toBeDefined();

    const mockRecord: Partial<AttendanceRecord> = {
      studentName: 'Grace Hopper',
      classDayId: 'day-1',
      status: 'present',
    };
    expect(mockRecord.status).toBe('present');
  });

  it('exports grades feature components and hooks via @/features/grades', () => {
    expect(GradesPage).toBeDefined();
    expect(Gradebook).toBeDefined();
    expect(useGrades).toBeDefined();
    expect(useGradeMutations).toBeDefined();
  });

  it('exports assignments feature components and hooks via @/features/assignments', () => {
    expect(AssignmentsPage).toBeDefined();
    expect(AssignmentList).toBeDefined();
    expect(useAssignments).toBeDefined();
    expect(useSubmissions).toBeDefined();
  });

  it('exports finance feature components and hooks via @/features/finance', () => {
    expect(FinancePage).toBeDefined();
    expect(FinancialSummary).toBeDefined();
    expect(useFinance).toBeDefined();
    expect(useInvoices).toBeDefined();
    expect(usePayments).toBeDefined();
  });

  it('exports dashboard, library, notifications, and reports via their respective feature barrels', () => {
    expect(Dashboard).toBeDefined();
    expect(StatCard).toBeDefined();
    expect(useDashboard).toBeDefined();

    expect(LibraryTab).toBeDefined();
    expect(useLibrary).toBeDefined();

    expect(NotificationCenter).toBeDefined();
    expect(useNotifications).toBeDefined();

    expect(ReportsPage).toBeDefined();
    expect(useReports).toBeDefined();
  });

  it('exports academics, auth, broadcasts, examinations, and schedule via feature barrels', () => {
    expect(AcademicCalendarView).toBeDefined();
    expect(MasterCourseCatalogView).toBeDefined();

    expect(LoginModal).toBeDefined();
    expect(authService).toBeDefined();

    expect(ClassroomMediaPlayer).toBeDefined();
    expect(ExamsTab).toBeDefined();
    expect(QuizTakerView).toBeDefined();
    expect(ScheduleTab).toBeDefined();
  });
});
