import { useCallback } from 'react';
import { toast } from 'sonner';
import { StudentSummary } from '../../../types';
import { StudentFormData } from '../types';
import { createStudentSummaryFromForm } from '../services/studentsService';

export interface UseStudentMutationsProps {
  students: StudentSummary[];
  onStudentsChange?: (updatedStudents: StudentSummary[]) => void;
  onDeleteStudent?: (studentIdentifier: string) => void;
}

export function useStudentMutations({
  students,
  onStudentsChange,
  onDeleteStudent,
}: UseStudentMutationsProps) {
  const saveStudent = useCallback(
    (formData: StudentFormData): StudentSummary => {
      const existing = students.find(
        (s) => s.id === formData.id || (formData.id && s.name === formData.id)
      );

      const newOrUpdated = createStudentSummaryFromForm(formData, existing);

      let updatedList: StudentSummary[];
      if (existing) {
        updatedList = students.map((s) => (s.id === newOrUpdated.id || s.name === existing.name ? newOrUpdated : s));
        toast.success(`Student profile for ${newOrUpdated.name} updated.`);
      } else {
        updatedList = [...students, newOrUpdated];
        toast.success(`Student ${newOrUpdated.name} enrolled successfully.`);
      }

      onStudentsChange?.(updatedList);
      return newOrUpdated;
    },
    [students, onStudentsChange]
  );

  const deleteStudent = useCallback(
    (studentIdOrName: string) => {
      const studentToDelete = students.find(
        (s) => s.id === studentIdOrName || s.studentId === studentIdOrName || s.name === studentIdOrName
      );

      const targetIdentifier = studentToDelete ? (studentToDelete.studentId || studentToDelete.id || studentToDelete.name) : studentIdOrName;

      const updatedList = students.filter(
        (s) => s.id !== targetIdentifier && s.studentId !== targetIdentifier && s.name !== studentToDelete?.name && s.name !== studentIdOrName
      );

      onStudentsChange?.(updatedList);

      if (onDeleteStudent) {
        onDeleteStudent(targetIdentifier);
      } else {
        toast.info(`Student profile for ${studentToDelete?.name || studentIdOrName} removed.`);
      }
    },
    [students, onStudentsChange, onDeleteStudent]
  );

  return {
    saveStudent,
    deleteStudent,
  };
}
