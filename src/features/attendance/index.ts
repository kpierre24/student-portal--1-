// Components & Modals
export { AttendancePage } from './components/AttendancePage';
export { AttendanceTable } from './components/AttendanceTable';
export { AttendanceSession } from './components/AttendanceSession';
export { AttendanceForm } from './components/AttendanceForm';
export { AttendanceSummary } from './components/AttendanceSummary';
export { AttendanceWorkspace } from './AttendanceWorkspace';
export { BatchEmailModal } from './BatchEmailModal';
export { PrintableReportModal } from './PrintableReportModal';

// Hooks
export { useAttendance, type UseAttendanceProps } from './hooks/useAttendance';
export { useAttendanceMutations } from './hooks/useAttendanceMutations';

// Services
export * from './services/attendanceService';

// Types
export * from './types';
