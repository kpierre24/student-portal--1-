/**
 * Level 1: Server State — Attendance Domain
 * Kept close to feature API layer: src/features/attendance/
 */
export { useAttendance, type UseAttendanceProps } from '../../features/attendance/hooks/useAttendance';
export { useAttendanceMutations } from '../../features/attendance/hooks/useAttendanceMutations';
export * from '../../features/attendance/services/attendanceService';
