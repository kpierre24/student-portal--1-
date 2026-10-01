import { StudentSummary } from '../../../types';
import { StudentFilterOptions, StudentStats, StudentFormData } from '../types';

export function filterStudents(
  students: StudentSummary[],
  options: StudentFilterOptions
): StudentSummary[] {
  return students.filter((student) => {
    // Search query match
    if (options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase().trim();
      const nameMatch = student.name.toLowerCase().includes(q);
      const emailMatch = student.email?.toLowerCase().includes(q) ?? false;
      const numberMatch = student.studentNumber?.toLowerCase().includes(q) ?? false;
      if (!nameMatch && !emailMatch && !numberMatch) return false;
    }

    // Level filter match
    if (options.levelId && options.levelId !== 'all') {
      if (student.levelId !== options.levelId) return false;
    }

    // Cohort filter match
    if (options.cohortId && options.cohortId !== 'all') {
      if (student.cohortId !== options.cohortId) return false;
    }

    // Enrollment status filter match
    const isDropped = student.isDroppedOut || student.enrollmentStatus === 'dropped_out' || student.enrollmentStatus === 'withdrawn';
    if (options.enrollmentFilter === 'active' && isDropped) return false;
    if (options.enrollmentFilter === 'dropped_out' && !isDropped) return false;
    if (options.enrollmentFilter === 'withdrawn' && student.enrollmentStatus !== 'withdrawn') return false;
    if (options.enrollmentFilter === 'graduated' && student.enrollmentStatus !== 'graduated') return false;
    if (options.enrollmentFilter === 'leave_of_absence' && student.enrollmentStatus !== 'leave_of_absence') return false;

    // Attendance status filter
    const rate = student.rate ?? 100;
    if (options.attendanceFilter === 'satisfactory' && rate < 75) return false;
    if (options.attendanceFilter === 'at_risk' && (rate >= 75 || rate <= 50)) return false;
    if (options.attendanceFilter === 'critical' && rate > 50) return false;

    // Grade status filter
    const avgScore = student.avgScore ?? 0;
    if (options.gradeFilter === 'honor_roll' && avgScore < 85) return false;
    if (options.gradeFilter === 'satisfactory' && (avgScore < 75 || avgScore >= 85)) return false;
    if (options.gradeFilter === 'at_risk' && avgScore >= 75) return false;

    return true;
  }).sort((a, b) => {
    const field = options.sortBy;
    const dir = options.sortDirection === 'asc' ? 1 : -1;

    if (field === 'name') {
      return a.name.localeCompare(b.name) * dir;
    }
    if (field === 'rate') {
      return ((a.rate ?? 0) - (b.rate ?? 0)) * dir;
    }
    if (field === 'avgScore') {
      return ((a.avgScore ?? 0) - (b.avgScore ?? 0)) * dir;
    }
    if (field === 'attended') {
      return ((a.attended ?? 0) - (b.attended ?? 0)) * dir;
    }
    return 0;
  });
}

export function computeStudentStats(students: StudentSummary[]): StudentStats {
  const total = students.length;
  if (total === 0) {
    return {
      total: 0,
      activeCount: 0,
      droppedOutCount: 0,
      satisfactoryCount: 0,
      atRiskCount: 0,
      criticalCount: 0,
      honorRollCount: 0,
      averageAttendanceRate: 0,
      averageGradeScore: 0,
    };
  }

  let satisfactoryCount = 0;
  let atRiskCount = 0;
  let criticalCount = 0;
  let honorRollCount = 0;
  let droppedOutCount = 0;
  let totalRate = 0;
  let totalScore = 0;
  let scoreCount = 0;

  students.forEach((s) => {
    const isDropped = s.isDroppedOut || s.enrollmentStatus === 'dropped_out' || s.enrollmentStatus === 'withdrawn';
    if (isDropped) {
      droppedOutCount++;
    }

    const rate = s.rate ?? 100;
    totalRate += rate;

    if (!isDropped) {
      if (rate >= 75) {
        satisfactoryCount++;
      } else if (rate <= 50) {
        criticalCount++;
        atRiskCount++;
      } else {
        atRiskCount++;
      }
    }

    if (s.avgScore !== null && s.avgScore !== undefined) {
      totalScore += s.avgScore;
      scoreCount++;
      if (s.avgScore >= 85 && !isDropped) {
        honorRollCount++;
      }
    }
  });

  return {
    total,
    activeCount: total - droppedOutCount,
    droppedOutCount,
    satisfactoryCount,
    atRiskCount,
    criticalCount,
    honorRollCount,
    averageAttendanceRate: Math.round(totalRate / total),
    averageGradeScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
  };
}

export function createStudentSummaryFromForm(
  formData: StudentFormData,
  existingStudent?: StudentSummary
): StudentSummary {
  const status = formData.enrollmentStatus || existingStudent?.enrollmentStatus || 'active';
  const isDropped = status === 'dropped_out' || status === 'withdrawn';
  return {
    id: formData.id || existingStudent?.id || `stu_${Date.now()}`,
    name: formData.name.trim(),
    studentNumber: formData.studentNumber || existingStudent?.studentNumber || `HTEIM-${Math.floor(1000 + Math.random() * 9000)}`,
    email: formData.email,
    phone: formData.phone,
    levelId: formData.levelId || 'level_1',
    enrolledModule: formData.enrolledModule,
    photoUrl: formData.photoUrl || existingStudent?.photoUrl,
    note: formData.note || existingStudent?.note,
    cohortId: formData.cohortId || existingStudent?.cohortId || 'HTEIM-2026',
    enrollmentStatus: status,
    isDroppedOut: isDropped,
    dropoutReason: formData.dropoutReason || existingStudent?.dropoutReason,
    dropoutDate: formData.dropoutDate || existingStudent?.dropoutDate,
    rate: existingStudent?.rate ?? 100,
    attended: existingStudent?.attended ?? 0,
    totalDays: existingStudent?.totalDays ?? 0,
    avgScore: existingStudent?.avgScore ?? null,
    attendanceByDay: existingStudent?.attendanceByDay ?? {},
  };
}
