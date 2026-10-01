/**
 * Level 1: Server State — Students Domain
 * Kept close to feature API layer: src/features/students/
 */
export { useStudents, type UseStudentsProps } from '../../features/students/hooks/useStudents';
export { useStudent } from '../../features/students/hooks/useStudent';
export { useStudentMutations } from '../../features/students/hooks/useStudentMutations';
export * from '../../features/students/services/studentsService';
