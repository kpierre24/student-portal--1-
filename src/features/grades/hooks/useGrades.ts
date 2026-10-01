import { useState, useMemo, useCallback } from 'react';
import { GradeRecord, GradeFilterOptions, GradeStats } from '../types';
import { filterGrades, calculateGradeStats } from '../services/gradesService';

interface UseGradesProps {
  initialGrades?: GradeRecord[];
  onGradesChange?: (grades: GradeRecord[]) => void;
  defaultCourse?: string;
}

export function useGrades({
  initialGrades = [],
  onGradesChange,
  defaultCourse = 'all',
}: UseGradesProps = {}) {
  const [grades, setGrades] = useState<GradeRecord[]>(initialGrades);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(defaultCourse);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);

  const handleSetGrades = useCallback(
    (newGrades: GradeRecord[] | ((prev: GradeRecord[]) => GradeRecord[])) => {
      setGrades((prev) => {
        const updated = typeof newGrades === 'function' ? newGrades(prev) : newGrades;
        if (onGradesChange) {
          onGradesChange(updated);
        }
        return updated;
      });
    },
    [onGradesChange]
  );

  const filterOptions: GradeFilterOptions = useMemo(
    () => ({
      search: searchQuery,
      courseCode: selectedCourse,
      status: selectedStatus,
    }),
    [searchQuery, selectedCourse, selectedStatus]
  );

  const filteredGrades = useMemo(() => {
    return filterGrades(grades, filterOptions);
  }, [grades, filterOptions]);

  const stats: GradeStats = useMemo(() => {
    return calculateGradeStats(grades);
  }, [grades]);

  const selectedGrade = useMemo(() => {
    if (!selectedGradeId) return null;
    return grades.find((g) => g.id === selectedGradeId || g.submissionId === selectedGradeId) || null;
  }, [grades, selectedGradeId]);

  return {
    grades,
    setGrades: handleSetGrades,
    filteredGrades,
    stats,
    selectedGrade,
    selectedGradeId,
    setSelectedGradeId,
    searchQuery,
    setSearchQuery,
    selectedCourse,
    setSelectedCourse,
    selectedStatus,
    setSelectedStatus,
  };
}
