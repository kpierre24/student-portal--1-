import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentsPage } from '../components/StudentsPage';
import { StudentSummary } from '../../../types';

describe('StudentsPage — User Interface & Business Behavior', () => {
  const mockStudents: StudentSummary[] = [
    {
      id: 'stu-1',
      name: 'Sarah Connor',
      studentNumber: 'HTEIM-2026-001',
      email: 'sarah@hteim.edu',
      rate: 95,
      attended: 19,
      totalDays: 20,
      avgScore: 92,
      levelId: 'level_1',
      cohortId: 'HTEIM-2026',
      attendanceByDay: {},
    },
    {
      id: 'stu-2',
      name: 'John Connor',
      studentNumber: 'HTEIM-2026-002',
      email: 'john@hteim.edu',
      rate: 65,
      attended: 13,
      totalDays: 20,
      avgScore: 78,
      levelId: 'level_1',
      cohortId: 'HTEIM-2026',
      attendanceByDay: {},
    },
  ];

  it('renders summary statistics metrics correctly', () => {
    render(<StudentsPage initialStudents={mockStudents} />);

    expect(screen.getByText('Total Enrolled')).toBeDefined();
    expect(screen.getByText('Sarah Connor')).toBeDefined();
    expect(screen.getByText('John Connor')).toBeDefined();
  });

  it('renders student search box and add student trigger button', () => {
    render(<StudentsPage initialStudents={mockStudents} />);

    expect(screen.getByPlaceholderText(/search by name/i)).toBeDefined();
    expect(screen.getByText(/enroll student/i)).toBeDefined();
  });
});
