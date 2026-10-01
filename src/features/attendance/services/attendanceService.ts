import { StudentSummary, ClassDay } from '../../../types';
import {
  AttendanceStatus,
  AttendanceSessionStats,
  AttendanceOverallStats,
} from '../types';

export function calculateAttendanceRate(
  attendedDays: number,
  totalDays: number,
  excusedDays: number = 0
): number {
  const effectiveTotal = Math.max(0, totalDays - excusedDays);
  if (effectiveTotal === 0) return 100;
  return Math.min(100, Math.max(0, Math.round((attendedDays / effectiveTotal) * 100)));
}

export function isAtRiskAttendance(rate: number): boolean {
  return rate < 75;
}

export function isCriticalAttendance(rate: number): boolean {
  return rate <= 50;
}

export function getSessionStats(
  classDay: ClassDay,
  students: StudentSummary[],
  excusedAbsences: Record<string, Record<string, boolean>> = {}
): AttendanceSessionStats {
  const classDayId = classDay.id;
  const totalStudents = students.length;

  let presentCount = 0;
  let absentCount = 0;
  let excusedCount = 0;

  students.forEach((s) => {
    const studentKey = (s.name || '').toLowerCase().trim();
    const isExcused = !!excusedAbsences[studentKey]?.[classDayId];
    const rec = s.attendanceByDay?.[classDayId];

    if (isExcused) {
      excusedCount++;
    } else if (rec?.present) {
      presentCount++;
    } else {
      absentCount++;
    }
  });

  const effectiveTotal = Math.max(1, totalStudents - excusedCount);
  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / effectiveTotal) * 100) : 0;

  return {
    classDayId,
    classDayName: classDay.name,
    date: classDay.date || classDay.name,
    totalStudents,
    presentCount,
    absentCount,
    excusedCount,
    attendanceRate,
    isLocked: classDay.isLocked ?? false,
  };
}

export function computeOverallAttendanceStats(
  students: StudentSummary[],
  classDays: ClassDay[] = []
): AttendanceOverallStats {
  const totalStudents = students.length;
  if (totalStudents === 0) {
    return {
      totalSessions: classDays.length,
      averageRate: 0,
      satisfactoryCount: 0,
      atRiskCount: 0,
      criticalCount: 0,
    };
  }

  let totalRate = 0;
  let satisfactoryCount = 0;
  let atRiskCount = 0;
  let criticalCount = 0;

  students.forEach((s) => {
    const rate = s.rate ?? 100;
    totalRate += rate;

    if (rate >= 75) {
      satisfactoryCount++;
    } else if (rate <= 50) {
      criticalCount++;
      atRiskCount++;
    } else {
      atRiskCount++;
    }
  });

  return {
    totalSessions: classDays.length,
    averageRate: Math.round(totalRate / totalStudents),
    satisfactoryCount,
    atRiskCount,
    criticalCount,
  };
}

export function getStudentAttendanceStatus(
  student: StudentSummary,
  classDayId: string,
  excusedAbsences: Record<string, Record<string, boolean>> = {}
): AttendanceStatus {
  const studentKey = (student.name || '').toLowerCase().trim();
  if (excusedAbsences[studentKey]?.[classDayId]) {
    return 'excused';
  }
  const record = student.attendanceByDay?.[classDayId];
  if (record?.present) {
    return 'present';
  }
  return 'absent';
}

export function filterStudentsByAttendanceStatus(
  students: StudentSummary[],
  classDayId: string,
  statusFilter: AttendanceStatus | 'all' | 'at_risk',
  searchQuery: string = '',
  excusedAbsences: Record<string, Record<string, boolean>> = {}
): StudentSummary[] {
  return students.filter((student) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = student.name.toLowerCase().includes(q);
      const matchId = student.studentNumber?.toLowerCase().includes(q) ?? false;
      if (!matchName && !matchId) return false;
    }

    if (statusFilter === 'all') return true;
    if (statusFilter === 'at_risk') {
      return (student.rate ?? 100) < 75;
    }

    const currentStatus = getStudentAttendanceStatus(student, classDayId, excusedAbsences);
    return currentStatus === statusFilter;
  });
}
