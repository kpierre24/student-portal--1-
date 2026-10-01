import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGrades } from '../hooks/useGrades';
import { GradeRecord } from '../types';

describe('useGrades Hook — State & Filtering Lifecycle', () => {
  const mockGrades: GradeRecord[] = [
    {
      id: 'g-1',
      submissionId: 'sub-1',
      studentId: 'stu-1',
      studentName: 'Hannah',
      assignmentId: 'asg-1',
      assignmentTitle: 'Old Testament History',
      courseCode: 'SOM-101',
      score: 88,
      maxPoints: 100,
      percentage: 88,
      status: 'GRADED',
      updatedAt: '2026-08-01',
    },
    {
      id: 'g-2',
      submissionId: 'sub-2',
      studentId: 'stu-2',
      studentName: 'Samuel',
      assignmentId: 'asg-2',
      assignmentTitle: 'New Testament Theology',
      courseCode: 'SOM-102',
      score: 65,
      maxPoints: 100,
      percentage: 65,
      status: 'RELEASED',
      updatedAt: '2026-08-01',
    },
  ];

  it('initializes with grades dataset and computes stats', () => {
    const { result } = renderHook(() => useGrades({ initialGrades: mockGrades }));

    expect(result.current.grades).toHaveLength(2);
    expect(result.current.stats.totalGrades).toBe(2);
    expect(result.current.stats.averagePercentage).toBe(77); // (88 + 65) / 2
  });

  it('filters grade records by search text query', () => {
    const { result } = renderHook(() => useGrades({ initialGrades: mockGrades }));

    act(() => {
      result.current.setSearchQuery('Samuel');
    });

    expect(result.current.filteredGrades).toHaveLength(1);
    expect(result.current.filteredGrades[0].studentName).toBe('Samuel');
  });

  it('filters grade records by course code selection', () => {
    const { result } = renderHook(() => useGrades({ initialGrades: mockGrades }));

    act(() => {
      result.current.setSelectedCourse('SOM-101');
    });

    expect(result.current.filteredGrades).toHaveLength(1);
    expect(result.current.filteredGrades[0].courseCode).toBe('SOM-101');
  });

  it('triggers onGradesChange callback when updating grades state', () => {
    const onGradesChange = vi.fn();
    const { result } = renderHook(() =>
      useGrades({ initialGrades: mockGrades, onGradesChange })
    );

    act(() => {
      result.current.setGrades((prev) => [
        ...prev,
        {
          id: 'g-3',
          submissionId: 'sub-3',
          studentId: 'stu-3',
          studentName: 'Elijah',
          assignmentId: 'asg-1',
          assignmentTitle: 'Prophetic Studies',
          courseCode: 'SOM-103',
          score: 95,
          maxPoints: 100,
          percentage: 95,
          status: 'GRADED',
          updatedAt: '2026-08-01',
        },
      ]);
    });

    expect(onGradesChange).toHaveBeenCalledTimes(1);
    expect(onGradesChange.mock.calls[0][0]).toHaveLength(3);
  });
});
