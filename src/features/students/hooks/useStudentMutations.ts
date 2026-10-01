import { useCallback } from 'react';
import { toast } from 'sonner';
import { StudentSummary } from '../../../types';
import { StudentFormData } from '../types';
import { createStudentSummaryFromForm } from '../services/studentsService';

export interface UseStudentMutationsProps {
  students: StudentSummary[];
  onStudentsChange?: (updatedStudents: StudentSummary[]) => void;
}

export function useStudentMutations({
  students,
  onStudentsChange,
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
        (s) => s.id === studentIdOrName || s.name === studentIdOrName
      );

      if (!studentToDelete) return;

      const updatedList = students.filter(
        (s) => s.id !== studentIdOrName && s.name !== studentIdOrName
      );

      onStudentsChange?.(updatedList);
      toast.info(`Student profile for ${studentToDelete.name} removed.`);
    },
    [students, onStudentsChange]
  );

  return {
    saveStudent,
    deleteStudent,
  };
}
