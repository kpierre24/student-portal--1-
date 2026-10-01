import { useState, useMemo, useCallback, useEffect } from 'react';
import { StudentSummary } from '../../../types';
import { StudentFilterOptions, StudentStats, StudentEnrollmentFilter } from '../types';
import { filterStudents, computeStudentStats } from '../services/studentsService';

export interface UseStudentsProps {
  initialStudents?: StudentSummary[];
  students?: StudentSummary[];
  initialLevelId?: string;
}

export function useStudents({
  initialStudents = [],
  students: externalStudents,
  initialLevelId = 'all',
}: UseStudentsProps = {}) {
  const initialSource = externalStudents && externalStudents.length > 0 ? externalStudents : initialStudents;
  const [students, setStudents] = useState<StudentSummary[]>(initialSource);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Sync state whenever external students or initialStudents change
  useEffect(() => {
    if (externalStudents !== undefined) {
      setStudents(externalStudents);
    } else if (initialStudents && initialStudents.length > 0) {
      setStudents(initialStudents);
    }
  }, [externalStudents, initialStudents]);

  const [filters, setFilters] = useState<StudentFilterOptions>({
    searchQuery: '',
    levelId: initialLevelId,
    attendanceFilter: 'all',
    gradeFilter: 'all',
    enrollmentFilter: 'all',
    cohortId: 'all',
    sortBy: 'name',
    sortDirection: 'asc',
  });

  const filteredStudents = useMemo(() => {
    return filterStudents(students, filters);
  }, [students, filters]);

  const stats: StudentStats = useMemo(() => {
    return computeStudentStats(students);
  }, [students]);

  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find((s) => s.id === selectedStudentId || s.name === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  const updateSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const updateLevelFilter = useCallback((levelId: string) => {
    setFilters((prev) => ({ ...prev, levelId }));
  }, []);

  const updateAttendanceFilter = useCallback((attendanceFilter: any) => {
    setFilters((prev) => ({ ...prev, attendanceFilter }));
  }, []);

  const updateGradeFilter = useCallback((gradeFilter: any) => {
    setFilters((prev) => ({ ...prev, gradeFilter }));
  }, []);

  const updateEnrollmentFilter = useCallback((enrollmentFilter: StudentEnrollmentFilter) => {
    setFilters((prev) => ({ ...prev, enrollmentFilter }));
  }, []);

  const setSorting = useCallback((field: any) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortDirection: prev.sortBy === field && prev.sortDirection === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      levelId: 'all',
      attendanceFilter: 'all',
      gradeFilter: 'all',
      enrollmentFilter: 'all',
      cohortId: 'all',
      sortBy: 'name',
      sortDirection: 'asc',
    });
  }, []);

  return {
    students,
    setStudents,
    filteredStudents,
    stats,
    selectedStudent,
    setSelectedStudentId,
    filters,
    setFilters,
    updateSearchQuery,
    updateLevelFilter,
    updateAttendanceFilter,
    updateGradeFilter,
    updateEnrollmentFilter,
    setSorting,
    resetFilters,
  };
}
