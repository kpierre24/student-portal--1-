import { StudentSummary, ClassDay, CustomAssignment } from '../../../types';

export interface DashboardMetrics {
  totalStudents: number;
  atRiskStudentsCount: number;
  honorRollCount: number;
  averageAttendanceRate: number;
  averageGradeScore: number;
  pendingAssignmentsCount: number;
  upcomingClassDaysCount: number;
}

export function computeDashboardMetrics(
  students: StudentSummary[] = [],
  classDays: ClassDay[] = [],
  assignments: CustomAssignment[] = []
): DashboardMetrics {
  const totalStudents = students.length;
  const atRiskStudents = students.filter((s) => (s.rate ?? 100) < 75);
  const honorRollStudents = students.filter((s) => (s.avgScore ?? 0) >= 85);

  const totalAttendance = students.reduce((acc, s) => acc + (s.rate ?? 0), 0);
  const averageAttendanceRate = totalStudents > 0 ? Math.round(totalAttendance / totalStudents) : 100;

  const totalGrade = students.reduce((acc, s) => acc + (s.avgScore ?? 0), 0);
  const averageGradeScore = totalStudents > 0 ? Math.round(totalGrade / totalStudents) : 0;

  return {
    totalStudents,
    atRiskStudentsCount: atRiskStudents.length,
    honorRollCount: honorRollStudents.length,
    averageAttendanceRate,
    averageGradeScore,
    pendingAssignmentsCount: assignments.length,
    upcomingClassDaysCount: classDays.length,
  };
}
