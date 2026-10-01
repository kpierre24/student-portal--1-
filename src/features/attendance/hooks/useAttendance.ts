import { useState, useMemo, useCallback } from 'react';
import { StudentSummary, ClassDay } from '../../../types';
import { AttendanceStatusFilter } from '../types';
import {
  getSessionStats,
  computeOverallAttendanceStats,
  filterStudentsByAttendanceStatus,
} from '../services/attendanceService';

export interface UseAttendanceProps {
  initialStudents?: StudentSummary[];
  initialClassDays?: ClassDay[];
  excusedAbsences?: Record<string, Record<string, boolean>>;
}

export function useAttendance({
  initialStudents = [],
  initialClassDays = [],
  excusedAbsences = {},
}: UseAttendanceProps = {}) {
  const [students, setStudents] = useState<StudentSummary[]>(initialStudents);
  const [classDays, setClassDays] = useState<ClassDay[]>(initialClassDays);

  const [selectedClassDayId, setSelectedClassDayId] = useState<string>(() => {
    return initialClassDays.length > 0 ? initialClassDays[initialClassDays.length - 1].id : '';
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatusFilter>('all');

  const selectedClassDay = useMemo(() => {
    return classDays.find((d) => d.id === selectedClassDayId) || classDays[classDays.length - 1] || null;
  }, [classDays, selectedClassDayId]);

  const activeClassDayId = selectedClassDay?.id || '';

  const currentSessionStats = useMemo(() => {
    if (!selectedClassDay) return null;
    return getSessionStats(selectedClassDay, students, excusedAbsences);
  }, [selectedClassDay, students, excusedAbsences]);

  const overallStats = useMemo(() => {
    return computeOverallAttendanceStats(students, classDays);
  }, [students, classDays]);

  const filteredStudents = useMemo(() => {
    if (!activeClassDayId) return students;
    return filterStudentsByAttendanceStatus(
      students,
      activeClassDayId,
      statusFilter,
      searchQuery,
      excusedAbsences
    );
  }, [students, activeClassDayId, statusFilter, searchQuery, excusedAbsences]);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
  }, []);

  return {
    students,
    setStudents,
    classDays,
    setClassDays,
    selectedClassDayId: activeClassDayId,
    setSelectedClassDayId,
    selectedClassDay,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    currentSessionStats,
    overallStats,
    filteredStudents,
    resetFilters,
  };
}
