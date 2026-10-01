import { StudentSummary, AcademicLevel, StudentEnrollmentStatus } from '../../types';

export type StudentAttendanceFilter = 'all' | 'satisfactory' | 'at_risk' | 'critical';
export type StudentGradeFilter = 'all' | 'honor_roll' | 'satisfactory' | 'at_risk';
export type StudentEnrollmentFilter = 'all' | 'active' | 'dropped_out' | 'withdrawn' | 'graduated' | 'leave_of_absence';
export type StudentSortField = 'name' | 'rate' | 'avgScore' | 'attended';
export type StudentSortDirection = 'asc' | 'desc';

export interface StudentFilterOptions {
  searchQuery: string;
  levelId: string;
  attendanceFilter: StudentAttendanceFilter;
  gradeFilter: StudentGradeFilter;
  enrollmentFilter?: StudentEnrollmentFilter;
  cohortId?: string;
  sortBy: StudentSortField;
  sortDirection: StudentSortDirection;
}

export interface StudentFormData {
  id?: string;
  name: string;
  studentNumber?: string;
  email?: string;
  phone?: string;
  levelId: string;
  enrolledModule?: string;
  photoUrl?: string;
  note?: string;
  cohortId?: string;
  enrollmentStatus?: StudentEnrollmentStatus;
  isDroppedOut?: boolean;
  dropoutReason?: string;
  dropoutDate?: string;
}

export interface StudentStats {
  total: number;
  activeCount: number;
  droppedOutCount: number;
  satisfactoryCount: number;
  atRiskCount: number;
  criticalCount: number;
  honorRollCount: number;
  averageAttendanceRate: number;
  averageGradeScore: number;
}
