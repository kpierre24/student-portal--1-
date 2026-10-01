import { useMemo } from 'react';
import { StudentSummary, ClassDay } from '../../../types';

export interface UseStudentProps {
  student: StudentSummary | null;
  classDays?: ClassDay[];
}

export function useStudent({ student, classDays = [] }: UseStudentProps) {
  const isAtRisk = useMemo(() => {
    if (!student) return false;
    return (student.rate ?? 100) < 75;
  }, [student]);

  const isHonorRoll = useMemo(() => {
    if (!student) return false;
    return (student.avgScore ?? 0) >= 85;
  }, [student]);

  const attendanceDetails = useMemo(() => {
    if (!student || !student.attendanceByDay) return [];
    
    return Object.entries(student.attendanceByDay).map(([dayId, record]) => {
      const classDay = classDays.find((c) => c.id === dayId);
      return {
        dayId,
        dayName: classDay?.name || dayId,
        present: record.present,
        timestamp: record.timestamp,
        score: record.score,
      };
    });
  }, [student, classDays]);

  return {
    student,
    isAtRisk,
    isHonorRoll,
    attendanceDetails,
  };
}
