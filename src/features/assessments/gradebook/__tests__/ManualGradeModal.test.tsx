import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ManualGradeModal } from '../ManualGradeModal';
import { CustomAssignment, AssignmentSubmission } from '../../../../types';

describe('ManualGradeModal — Manual Grading for Individual & Group Assignments', () => {
  const mockGroupAssignment: CustomAssignment = {
    id: 'asg-group-1',
    title: 'Pauline Epistles Group Exegesis',
    description: 'Collaborative analysis of Romans chapter 8',
    dueDate: '2026-11-15',
    maxPoints: 100,
    createdAt: '2026-10-01T00:00:00Z',
    isGroupAssignment: true,
    groups: [
      {
        id: 'grp-1',
        groupName: 'Group Alpha - Antioch',
        memberNames: ['Student One', 'Student Two', 'Student Three'],
      },
      {
        id: 'grp-2',
        groupName: 'Group Beta - Berea',
        memberNames: ['Student Four', 'Student Five'],
      },
    ],
  };

  const mockIndividualAssignment: CustomAssignment = {
    id: 'asg-indiv-1',
    title: 'Individual Hermeneutics Essay',
    description: 'Personal essay on historical-grammatical interpretation',
    dueDate: '2026-11-20',
    maxPoints: 50,
    createdAt: '2026-10-01T00:00:00Z',
    isGroupAssignment: false,
  };

  const mockStudents = [
    { id: '1', name: 'Student One', email: 's1@example.test' },
    { id: '2', name: 'Student Two', email: 's2@example.test' },
    { id: '3', name: 'Student Three', email: 's3@example.test' },
    { id: '4', name: 'Student Four', email: 's4@example.test' },
  ];

  const mockSubmissions: AssignmentSubmission[] = [
    {
      id: 'sub-existing-1',
      assignmentId: 'asg-group-1',
      studentName: 'Student One',
      submittedAt: '2026-11-14T10:00:00Z',
      updatedAt: '2026-11-14T10:00:00Z',
      score: 80,
      teacherFeedback: 'Good start',
      status: 'Graded',
    },
  ];

  it('renders modal when open is true', () => {
    render(
      <ManualGradeModal
        isOpen={true}
        onClose={vi.fn()}
        assignments={[mockGroupAssignment, mockIndividualAssignment]}
        students={mockStudents}
        submissions={mockSubmissions}
      />
    );

    expect(screen.getByText('Manual Grade Entry')).toBeDefined();
    expect(screen.getByText(/Directly award marks for individual or group assignments/i)).toBeDefined();
  });

  it('displays group notice and all group members when a group assignment is selected', () => {
    render(
      <ManualGradeModal
        isOpen={true}
        onClose={vi.fn()}
        assignments={[mockGroupAssignment, mockIndividualAssignment]}
        students={mockStudents}
        submissions={[]}
        defaultAssignmentId="asg-group-1"
      />
    );

    expect(screen.getByText(/Group Assignment Grading Policy/i)).toBeDefined();
    expect(screen.getByText(/Marks given will automatically apply to/i)).toBeDefined();
    expect(screen.getByText('Student One')).toBeDefined();
    expect(screen.getByText('Student Two')).toBeDefined();
    expect(screen.getByText('Student Three')).toBeDefined();
  });

  it('submits grade for all members of the group simultaneously on group assignment', () => {
    const onGradeSubmission = vi.fn();
    const { container } = render(
      <ManualGradeModal
        isOpen={true}
        onClose={vi.fn()}
        assignments={[mockGroupAssignment]}
        students={mockStudents}
        submissions={mockSubmissions}
        onGradeSubmission={onGradeSubmission}
        defaultAssignmentId="asg-group-1"
      />
    );

    // Enter score 95
    const scoreInput = container.querySelector('input[type="number"]') as HTMLInputElement;
    expect(scoreInput).toBeDefined();
    fireEvent.change(scoreInput, { target: { value: '95' } });

    // Enter feedback
    const feedbackInput = screen.getByPlaceholderText(/Commendations on doctrinal depth/i);
    fireEvent.change(feedbackInput, { target: { value: 'Outstanding collaborative analysis!' } });

    // Submit form
    const submitBtn = screen.getByText(/Record Grade for All 3 Members/i);
    fireEvent.click(submitBtn);

    // Verify onGradeSubmission was called 3 times (once per group member) with identical score and feedback
    expect(onGradeSubmission).toHaveBeenCalledTimes(3);

    // Check first member (had existing submission sub-existing-1)
    expect(onGradeSubmission).toHaveBeenCalledWith(
      'sub-existing-1',
      95,
      'Outstanding collaborative analysis!'
    );

    // Check second member (new synthetic manual-grade ID)
    expect(onGradeSubmission).toHaveBeenCalledWith(
      'manual-grade|asg-group-1|Student Two',
      95,
      'Outstanding collaborative analysis!'
    );

    // Check third member
    expect(onGradeSubmission).toHaveBeenCalledWith(
      'manual-grade|asg-group-1|Student Three',
      95,
      'Outstanding collaborative analysis!'
    );
  });

  it('submits grade for an individual student when individual assignment is selected', () => {
    const onGradeSubmission = vi.fn();
    const { container } = render(
      <ManualGradeModal
        isOpen={true}
        onClose={vi.fn()}
        assignments={[mockIndividualAssignment]}
        students={mockStudents}
        submissions={[]}
        onGradeSubmission={onGradeSubmission}
        defaultAssignmentId="asg-indiv-1"
        defaultStudentName="Student Four"
      />
    );

    // Should not show group assignment policy notice
    expect(screen.queryByText(/Group Assignment Grading Policy/i)).toBeNull();

    // Enter score 48
    const scoreInput = container.querySelector('input[type="number"]') as HTMLInputElement;
    expect(scoreInput).toBeDefined();
    fireEvent.change(scoreInput, { target: { value: '48' } });

    // Submit form
    const submitBtn = screen.getByText('Record Official Grade');
    fireEvent.click(submitBtn);

    // Verify onGradeSubmission called once with max score clamped if needed
    expect(onGradeSubmission).toHaveBeenCalledTimes(1);
    expect(onGradeSubmission).toHaveBeenCalledWith(
      'manual-grade|asg-indiv-1|Student Four',
      48,
      ''
    );
  });
});
