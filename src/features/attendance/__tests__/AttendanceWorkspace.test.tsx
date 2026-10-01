import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttendanceWorkspace } from '../AttendanceWorkspace';

describe('AttendanceWorkspace — Attendance Operations & Policy Verification', () => {
  const mockStudents = [
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
      attendanceByDay: { '2026-08-01': { present: true } },
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
      attendanceByDay: { '2026-08-01': { present: false } },
    },
  ];

  const mockClassDays = [
    {
      id: 'day-1',
      date: '2026-08-01',
      label: 'Class Day 1: Systematic Theology',
      isLocked: false,
    },
  ];

  const defaultProps: any = {
    appUser: { role: 'admin' },
    currentStudentPortalData: null,
    classDays: mockClassDays,
    rubricScores: {},
    onUpdateStudentPhoto: vi.fn(),
    onRequestTranscript: vi.fn(),
    onRequestCertificate: vi.fn(),
    atRiskThreshold: 75,
    satisfactoryThreshold: 75,
    records: [],
    uniqueStudents: mockStudents,
    excusedAbsences: {},
    studentPhotos: {},
    studentNotes: {},
    searchQuery: '',
    setSearchQuery: vi.fn(),
    dateRangeFilter: 'all',
    setDateRangeFilter: vi.fn(),
    selectedModule: 'all',
    setSelectedModule: vi.fn(),
    sortBy: 'name_asc',
    setSortBy: vi.fn(),
    viewMode: 'matrix',
    setViewMode: vi.fn(),
    densityMode: 'comfortable',
    setDensityMode: vi.fn(),
    statusFilter: 'all',
    setStatusFilter: vi.fn(),
    selectedStudent: null,
    setSelectedStudent: vi.fn(),
    selectedStudentNames: [],
    setSelectedStudentNames: vi.fn(),
    filteredAndSortedStudents: mockStudents,
    effectiveClassDays: mockClassDays,
    classDayStats: {},
    trendChartData: [],
    getStudentBadges: vi.fn(() => []),
    syncing: false,
    onManualSync: vi.fn(),
    onToggleAttendance: vi.fn(),
  };

  it('renders student attendance workspace', () => {
    render(<AttendanceWorkspace {...defaultProps} />);

    expect(screen.getAllByText('Philip the Evangelist').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Stephen the Martyr').length).toBeGreaterThan(0);
  });
});
