import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStudents } from '../hooks/useStudents';
import { StudentSummary } from '../../../types';

describe('useStudents Hook — Business State Management', () => {
  const initialStudents: StudentSummary[] = [
    {
      id: 'stu-1',
      name: 'Sister Mary',
      studentNumber: 'HTEIM-101',
      rate: 95,
      attended: 19,
      totalDays: 20,
      avgScore: 90,
      levelId: 'level_1',
      cohortId: 'HTEIM-2026',
      attendanceByDay: {},
    },
    {
      id: 'stu-2',
      name: 'Brother David',
      studentNumber: 'HTEIM-102',
      rate: 50,
      attended: 10,
      totalDays: 20,
      avgScore: 72,
      levelId: 'level_2',
      cohortId: 'HTEIM-2026',
      attendanceByDay: {},
    },
  ];

  it('initializes with provided students and computes roster stats', () => {
    const { result } = renderHook(() => useStudents({ initialStudents }));

    expect(result.current.students).toHaveLength(2);
    expect(result.current.filteredStudents).toHaveLength(2);
    expect(result.current.stats.total).toBe(2);
    expect(result.current.stats.honorRollCount).toBe(1);
  });

  it('filters students dynamically when search query is updated', () => {
    const { result } = renderHook(() => useStudents({ initialStudents }));

    act(() => {
      result.current.updateSearchQuery('David');
    });

    expect(result.current.filteredStudents).toHaveLength(1);
    expect(result.current.filteredStudents[0].name).toBe('Brother David');
  });

  it('selects a specific student by ID or name', () => {
    const { result } = renderHook(() => useStudents({ initialStudents }));

    act(() => {
      result.current.setSelectedStudentId('stu-2');
    });

    expect(result.current.selectedStudent?.name).toBe('Brother David');
  });

  it('resets all search and filter options back to initial defaults', () => {
    const { result } = renderHook(() => useStudents({ initialStudents }));

    act(() => {
      result.current.updateSearchQuery('David');
      result.current.updateLevelFilter('level_2');
    });

    expect(result.current.filteredStudents).toHaveLength(1);

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filteredStudents).toHaveLength(2);
    expect(result.current.filters.searchQuery).toBe('');
    expect(result.current.filters.levelId).toBe('all');
  });
});
