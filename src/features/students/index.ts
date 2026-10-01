// Components
export { StudentsPage } from './components/StudentsPage';
export { StudentTable } from './components/StudentTable';
export { StudentCard } from './components/StudentCard';
export { StudentForm } from './components/StudentForm';
export { StudentDetails } from './components/StudentDetails';
export { StudentFilters } from './components/StudentFilters';
export { StudentSearch } from './components/StudentSearch';
export { StudentDetailModal } from './StudentDetailModal';
export { StudentTranscriptModal } from './StudentTranscriptModal';
export { CertificateModal } from './CertificateModal';

// Hooks
export { useStudents, type UseStudentsProps } from './hooks/useStudents';
export { useStudent } from './hooks/useStudent';
export { useStudentMutations } from './hooks/useStudentMutations';

// Services & Canonicalization
export * from './services/studentsService';
export * from './studentCanonicalization';

// Types
export * from './types';
export type { StudentSummary as Student } from '../../types';
