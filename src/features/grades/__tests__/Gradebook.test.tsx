import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Gradebook } from '../components/Gradebook';
import { GradeRecord } from '../types';

describe('Gradebook Component — UI & Selection Behavior', () => {
  const mockGrades: GradeRecord[] = [
    {
      id: 'g-101',
      submissionId: 'sub-101',
      studentId: 'stu-1',
      studentName: 'Deborah the Judge',
      assignmentId: 'asg-1',
      assignmentTitle: 'Old Testament History',
      courseCode: 'SOM-101',
      score: 92,
      maxPoints: 100,
      percentage: 92,
      status: 'RELEASED',
      updatedAt: '2026-08-01',
    },
    {
      id: 'g-102',
      submissionId: 'sub-102',
      studentId: 'stu-2',
      studentName: 'Gideon',
      assignmentId: 'asg-2',
      assignmentTitle: 'Biblical Leadership',
      courseCode: 'SOM-102',
      score: 78,
      maxPoints: 100,
      percentage: 78,
      status: 'GRADED',
      updatedAt: '2026-08-01',
    },
  ];

  it('renders student grade entries with category classification badges', () => {
    render(
      <Gradebook
        grades={mockGrades}
        onSelectGrade={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        selectedCourse="all"
        onCourseChange={vi.fn()}
        selectedStatus="all"
        onStatusChange={vi.fn()}
      />
    );

    expect(screen.getByText('Deborah the Judge')).toBeDefined();
    expect(screen.getByText('Gideon')).toBeDefined();
    expect(screen.getByText('Honor Roll')).toBeDefined(); // 92%
    expect(screen.getByText('Satisfactory')).toBeDefined(); // 78%
  });
});
