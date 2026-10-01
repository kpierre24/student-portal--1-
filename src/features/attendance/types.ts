import { StudentSummary, ClassDay } from '../../types';

export type AttendanceStatus = 'present' | 'absent' | 'excused';

export type AttendanceStatusFilter = 'all' | 'present' | 'absent' | 'excused' | 'at_risk';

export interface AttendanceRecord {
  studentName: string;
  classDayId: string;
  status: AttendanceStatus;
  timestamp?: string;
  score?: string;
  note?: string;
  isExcused?: boolean;
}

export interface AttendanceSessionStats {
  classDayId: string;
  classDayName: string;
  date?: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  attendanceRate: number;
  isLocked: boolean;
  hoursUntilLock?: number;
}

export interface AttendanceOverallStats {
  totalSessions: number;
  averageRate: number;
  satisfactoryCount: number;
  atRiskCount: number;
  criticalCount: number;
}

export interface ExcusedAbsenceRequest {
  studentName: string;
  classDayId: string;
  reason: string;
  timestamp: string;
  approved: boolean;
}

export interface AttendanceFormData {
  classDayName: string;
  date: string;
  notes?: string;
  locked?: boolean;
}
