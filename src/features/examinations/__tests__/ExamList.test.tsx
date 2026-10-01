import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExamList } from '../components/ExamList';
import { CustomAssignment } from '../../../types';

describe('ExamList Component — Business Filtering & View Controls', () => {
  const mockAssignments: CustomAssignment[] = [
    {
      id: 'asg-1',
      title: 'Hermeneutics Exegesis Paper',
      courseCode: 'SOM-101',
      moduleTrack: 'General Ministry',
      description: 'Write a 3-page exegesis on Romans 8.',
      dueDate: '2026-09-30',
      maxPoints: 100,
      createdAt: '2026-08-15',
      type: 'document',
    },
    {
      id: 'asg-2',
      title: 'Homiletics Sermon Outline',
      courseCode: 'SOM-201',
      moduleTrack: 'Leadership Track',
      description: 'Prepare a 3-point expository outline.',
      dueDate: '2026-10-15',
      maxPoints: 50,
      createdAt: '2026-08-16',
      type: 'document',
    },
  ];

  it('renders assignment titles, course codes, and maximum point values', () => {
    render(
      <ExamList
        assignments={mockAssignments}
        submissions={[]}
        userRole="admin"
        onNewAssignment={vi.fn()}
        onEditAssignment={vi.fn()}
        onDeleteAssignment={vi.fn()}
        onSelectAssignment={vi.fn()}
        onSubmitWork={vi.fn()}
        onStartQuiz={vi.fn()}
        onViewSubmissions={vi.fn()}
      />
    );

    expect(screen.getByText('Hermeneutics Exegesis Paper')).toBeDefined();
    expect(screen.getByText('Homiletics Sermon Outline')).toBeDefined();
    expect(screen.getByText('100 pts')).toBeDefined();
    expect(screen.getByText('50 pts')).toBeDefined();
  });
});
