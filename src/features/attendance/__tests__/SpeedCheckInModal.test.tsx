import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpeedCheckInModal } from '../../../components/SpeedCheckInModal';
import { StudentSummary, ClassDay } from '../../../types';

describe('SpeedCheckInModal — Rapid-Fire Mobile Attendance ("Speed Check-In")', () => {
  const mockStudents: StudentSummary[] = [
    {
      id: 'stu-1',
      name: 'Philip the Evangelist',
      studentNumber: 'HTEIM-2026-301',
      rate: 90,
      attended: 18,
      totalDays: 20,
      avgScore: 88,
      levelId: 'level_1',
      cohortId: 'HTEIM-2026',
      attendanceByDay: {},
    },
    {
      id: 'stu-2',
      name: 'Stephen the Martyr',
      studentNumber: 'HTEIM-2026-302',
      rate: 60,
      attended: 12,
      totalDays: 20,
      avgScore: 80,
      levelId: 'level_1',
      cohortId: 'HTEIM-2026',
      attendanceByDay: {},
    },
  ];

  const mockClassDays: ClassDay[] = [
    {
      id: 'day-1',
      name: 'Class Day 1: Systematic Theology',
      date: '2026-08-01',
      isLocked: false,
    },
  ];

  const mockOnToggleAttendance = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Speed Check-In modal when isOpen is true', () => {
    const { container } = render(
      <SpeedCheckInModal
        isOpen={true}
        onClose={mockOnClose}
        students={mockStudents}
        classDays={mockClassDays}
        activeDayId="day-1"
        onToggleAttendance={mockOnToggleAttendance}
      />
    );

    expect(container.querySelector('#speed-check-in-modal')).toBeTruthy();
    expect(screen.getByText('Speed Check-In')).toBeTruthy();
    expect(screen.getByText('Philip the Evangelist')).toBeTruthy();
    expect(screen.getByText(/0 of 2 Students Marked/i)).toBeTruthy();
  });

  it('marks present on tap and auto-advances to the next student', () => {
    const { container } = render(
      <SpeedCheckInModal
        isOpen={true}
        onClose={mockOnClose}
        students={mockStudents}
        classDays={mockClassDays}
        activeDayId="day-1"
        onToggleAttendance={mockOnToggleAttendance}
      />
    );

    // Initial student
    expect(screen.getByText('Philip the Evangelist')).toBeTruthy();

    // Click Present button
    const presentBtn = container.querySelector('#speed-checkin-btn-present') as HTMLElement;
    fireEvent.click(presentBtn);

    // Verify toggle handler called with 'present'
    expect(mockOnToggleAttendance).toHaveBeenCalledWith(
      'Philip the Evangelist',
      'day-1',
      'present'
    );

    // Auto-advances to second student
    expect(screen.getByText('Stephen the Martyr')).toBeTruthy();
  });

  it('marks late on tap and auto-advances to the next student', () => {
    const { container } = render(
      <SpeedCheckInModal
        isOpen={true}
        onClose={mockOnClose}
        students={mockStudents}
        classDays={mockClassDays}
        activeDayId="day-1"
        onToggleAttendance={mockOnToggleAttendance}
      />
    );

    const lateBtn = container.querySelector('#speed-checkin-btn-late') as HTMLElement;
    fireEvent.click(lateBtn);

    expect(mockOnToggleAttendance).toHaveBeenCalledWith(
      'Philip the Evangelist',
      'day-1',
      'late'
    );
    expect(screen.getByText('Stephen the Martyr')).toBeTruthy();
  });

  it('marks absent on tap and auto-advances', () => {
    const { container } = render(
      <SpeedCheckInModal
        isOpen={true}
        onClose={mockOnClose}
        students={mockStudents}
        classDays={mockClassDays}
        activeDayId="day-1"
        onToggleAttendance={mockOnToggleAttendance}
      />
    );

    const absentBtn = container.querySelector('#speed-checkin-btn-absent') as HTMLElement;
    fireEvent.click(absentBtn);

    expect(mockOnToggleAttendance).toHaveBeenCalledWith(
      'Philip the Evangelist',
      'day-1',
      'absent'
    );
    expect(screen.getByText('Stephen the Martyr')).toBeTruthy();
  });

  it('displays instant undo toast on mark and reverts when Undo is tapped', () => {
    const { container } = render(
      <SpeedCheckInModal
        isOpen={true}
        onClose={mockOnClose}
        students={mockStudents}
        classDays={mockClassDays}
        activeDayId="day-1"
        onToggleAttendance={mockOnToggleAttendance}
      />
    );

    const presentBtn = container.querySelector('#speed-checkin-btn-present') as HTMLElement;
    fireEvent.click(presentBtn);

    // Toast appears
    expect(container.querySelector('#speed-checkin-toast')).toBeTruthy();

    // Click Undo in toast
    const undoBtn = container.querySelector('#speed-checkin-toast-undo') as HTMLElement;
    fireEvent.click(undoBtn);

    // Expect toggle back to 'unmarked'
    expect(mockOnToggleAttendance).toHaveBeenCalledWith(
      'Philip the Evangelist',
      'day-1',
      'unmarked'
    );

    // Returns to first student
    expect(screen.getAllByText('Philip the Evangelist').length).toBeGreaterThan(0);
  });

  it('supports keyboard shortcuts for rapid attendance check-in', () => {
    render(
      <SpeedCheckInModal
        isOpen={true}
        onClose={mockOnClose}
        students={mockStudents}
        classDays={mockClassDays}
        activeDayId="day-1"
        onToggleAttendance={mockOnToggleAttendance}
      />
    );

    // Press 'p' for present
    fireEvent.keyDown(window, { key: 'p' });
    expect(mockOnToggleAttendance).toHaveBeenCalledWith(
      'Philip the Evangelist',
      'day-1',
      'present'
    );

    // Next student is active; press 'l' for late
    fireEvent.keyDown(window, { key: 'l' });
    expect(mockOnToggleAttendance).toHaveBeenCalledWith(
      'Stephen the Martyr',
      'day-1',
      'late'
    );

    // Shows roll call completed state
    expect(screen.getByText(/Roll Call Completed!/i)).toBeTruthy();
  });

  it('displays completion screen when all students are completed', () => {
    const { container } = render(
      <SpeedCheckInModal
        isOpen={true}
        onClose={mockOnClose}
        students={mockStudents}
        classDays={mockClassDays}
        activeDayId="day-1"
        onToggleAttendance={mockOnToggleAttendance}
      />
    );

    // Mark student 1
    const presentBtn = container.querySelector('#speed-checkin-btn-present') as HTMLElement;
    fireEvent.click(presentBtn);
    // Mark student 2
    fireEvent.click(presentBtn);

    // Completion view appears
    expect(screen.getByText(/Roll Call Completed!/i)).toBeTruthy();
    expect(container.querySelector('#speed-checkin-btn-done')).toBeTruthy();
  });
});
