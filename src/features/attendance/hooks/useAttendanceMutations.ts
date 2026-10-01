import { useCallback } from 'react';
import { toast } from 'sonner';
import { StudentSummary, ClassDay } from '../../../types';
import { AttendanceStatus } from '../types';

export interface UseAttendanceMutationsProps {
  students: StudentSummary[];
  classDays: ClassDay[];
  onStudentsChange?: (updatedStudents: StudentSummary[]) => void;
  onClassDaysChange?: (updatedClassDays: ClassDay[]) => void;
  onToggleAttendance?: (
    studentName: string,
    classDayId: string,
    newStatus: 'present' | 'absent' | 'excused'
  ) => void;
  onExcusedAbsenceSubmit?: (studentName: string, classDayId: string, reason: string) => void;
}

export function useAttendanceMutations({
  students,
  classDays,
  onStudentsChange,
  onClassDaysChange,
  onToggleAttendance,
  onExcusedAbsenceSubmit,
}: UseAttendanceMutationsProps) {
  const markAttendance = useCallback(
    (studentName: string, classDayId: string, status: AttendanceStatus) => {
      if (onToggleAttendance) {
        onToggleAttendance(studentName, classDayId, status);
        toast.success(`Updated ${studentName}'s attendance to ${status.toUpperCase()}`);
        return;
      }

      const updatedStudents = students.map((s) => {
        if (s.name !== studentName && s.id !== studentName) return s;

        const currentAttendance = { ...(s.attendanceByDay || {}) };
        const isPresent = status === 'present';
        
        currentAttendance[classDayId] = {
          present: isPresent,
          timestamp: new Date().toISOString(),
        };

        let attended = 0;
        Object.values(currentAttendance).forEach((rec) => {
          if (rec.present) attended++;
        });

        const totalDays = Math.max(classDays.length, Object.keys(currentAttendance).length);
        const rate = totalDays > 0 ? Math.round((attended / totalDays) * 100) : 100;

        return {
          ...s,
          attended,
          totalDays,
          rate,
          attendanceByDay: currentAttendance,
        };
      });

      onStudentsChange?.(updatedStudents);
      toast.success(`Updated ${studentName}'s attendance to ${status.toUpperCase()}`);
    },
    [students, classDays, onToggleAttendance, onStudentsChange]
  );

  const markBulkAttendance = useCallback(
    (classDayId: string, status: 'present' | 'absent', targetStudents: StudentSummary[]) => {
      targetStudents.forEach((student) => {
        markAttendance(student.name, classDayId, status);
      });
      toast.success(`Marked ${targetStudents.length} students as ${status.toUpperCase()}`);
    },
    [markAttendance]
  );

  const submitExcusedAbsence = useCallback(
    (studentName: string, classDayId: string, reason: string) => {
      if (onExcusedAbsenceSubmit) {
        onExcusedAbsenceSubmit(studentName, classDayId, reason);
      }
      toast.info(`Excused absence logged for ${studentName}`);
    },
    [onExcusedAbsenceSubmit]
  );

  const createClassDaySession = useCallback(
    (sessionData: { name: string; date?: string }) => {
      const newSession: ClassDay = {
        id: `day_${Date.now()}`,
        name: sessionData.name.trim(),
        date: sessionData.date || new Date().toISOString().split('T')[0],
        isLocked: false,
      };

      const updatedSessions = [...classDays, newSession];
      onClassDaysChange?.(updatedSessions);
      toast.success(`New attendance session "${newSession.name}" created.`);
      return newSession;
    },
    [classDays, onClassDaysChange]
  );

  return {
    markAttendance,
    markBulkAttendance,
    submitExcusedAbsence,
    createClassDaySession,
  };
}
