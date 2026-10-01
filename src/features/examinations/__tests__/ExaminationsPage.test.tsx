import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExaminationsPage } from '../components/ExaminationsPage';

describe('ExaminationsPage — Assessment Portal Operations', () => {
  const defaultProps = {
    students: [],
    allQuizSheets: [],
    rubricScores: {},
    onUpdateRubric: vi.fn(),
    customAssignments: [],
    setCustomAssignments: vi.fn(),
    submissions: [],
    setSubmissions: vi.fn(),
  };

  it('renders page header and navigation sub-tabs', () => {
    render(<ExaminationsPage {...defaultProps} />);

    expect(screen.getByText('Exams, Written Assignments & Evaluations')).toBeDefined();
    expect(screen.getByText('Written Assignments')).toBeDefined();
    expect(screen.getByText('Quiz Score Matrix')).toBeDefined();
  });
});
