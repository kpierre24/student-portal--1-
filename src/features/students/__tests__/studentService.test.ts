import { describe, it, expect } from 'vitest';
import { filterStudents, computeStudentStats, createStudentSummaryFromForm } from '../services/studentsService';
import { StudentSummary } from '../../../types';
import { StudentFilterOptions, StudentFormData } from '../types';

describe('studentService — Business Behavior Tests', () => {
  const mockStudents: StudentSummary[] = [
    {
      id: 'stu-1',
      name: 'Grace Hopper',
      studentNumber: 'HTEIM-2026-1001',
      email: 'grace@hteim.edu',
      levelId: 'level_1',
      cohortId: 'HTEIM-2026',
      rate: 90,
      attended: 9,
      totalDays: 10,
      avgScore: 88,
      attendanceByDay: {},
    },
    {
      id: 'stu-2',
      name: 'John Wesley',
      studentNumber: 'HTEIM-2026-1002',
      email: 'john@hteim.edu',
      levelId: 'level_2',
      cohortId: 'HTEIM-2026',
      rate: 60,
      attended: 6,
      totalDays: 10,
      avgScore: 70,
      attendanceByDay: {},
    },
    {
      id: 'stu-3',
      name: 'Charles Spurgeon',
      studentNumber: 'HTEIM-2026-1003',
      email: 'charles@hteim.edu',
      levelId: 'level_1',
      cohortId: 'HTEIM-2025',
      rate: 45,
      attended: 4,
      totalDays: 10,
      avgScore: 92,
      attendanceByDay: {},
    },
  ];

  describe('filterStudents', () => {
    const defaultFilters: StudentFilterOptions = {
      searchQuery: '',
      levelId: 'all',
      attendanceFilter: 'all',
      gradeFilter: 'all',
      cohortId: 'all',
      sortBy: 'name',
      sortDirection: 'asc',
    };

    it('filters students by search query matching name or student number', () => {
      const result = filterStudents(mockStudents, { ...defaultFilters, searchQuery: 'Grace' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Grace Hopper');

      const byNumber = filterStudents(mockStudents, { ...defaultFilters, searchQuery: '1003' });
      expect(byNumber).toHaveLength(1);
      expect(byNumber[0].name).toBe('Charles Spurgeon');
    });

    it('filters students by attendance status thresholds (75% satisfactory, <=50% critical)', () => {
      const satisfactory = filterStudents(mockStudents, { ...defaultFilters, attendanceFilter: 'satisfactory' });
      expect(satisfactory).toHaveLength(1);
      expect(satisfactory[0].name).toBe('Grace Hopper');

      const critical = filterStudents(mockStudents, { ...defaultFilters, attendanceFilter: 'critical' });
      expect(critical).toHaveLength(1);
      expect(critical[0].name).toBe('Charles Spurgeon');
    });

    it('filters students by grade honor roll threshold (>= 85%)', () => {
      const honorRoll = filterStudents(mockStudents, { ...defaultFilters, gradeFilter: 'honor_roll' });
      expect(honorRoll).toHaveLength(2); // Grace (88) and Charles (92)
      expect(honorRoll.map(s => s.name)).toContain('Grace Hopper');
      expect(honorRoll.map(s => s.name)).toContain('Charles Spurgeon');
    });

    it('sorts students deterministically by attendance rate or average score', () => {
      const sortedByRate = filterStudents(mockStudents, { ...defaultFilters, sortBy: 'rate', sortDirection: 'desc' });
      expect(sortedByRate[0].name).toBe('Grace Hopper');
      expect(sortedByRate[2].name).toBe('Charles Spurgeon');
    });
  });

  describe('computeStudentStats', () => {
    it('computes accurate counts and attendance/grade averages across enrolled roster', () => {
      const stats = computeStudentStats(mockStudents);

      expect(stats.total).toBe(3);
      expect(stats.satisfactoryCount).toBe(1); // rate >= 75
      expect(stats.atRiskCount).toBe(2); // rate < 75
      expect(stats.criticalCount).toBe(1); // rate <= 50
      expect(stats.honorRollCount).toBe(2); // score >= 85
      expect(stats.averageAttendanceRate).toBe(65); // (90 + 60 + 45) / 3 = 65
      expect(stats.averageGradeScore).toBe(83); // (88 + 70 + 92) / 3 = 83.33 -> 83
    });

    it('handles empty student list gracefully without division by zero', () => {
      const stats = computeStudentStats([]);
      expect(stats.total).toBe(0);
      expect(stats.averageAttendanceRate).toBe(0);
      expect(stats.averageGradeScore).toBe(0);
    });
  });

  describe('createStudentSummaryFromForm', () => {
    it('constructs student summary with defaulted values and trimmed fields', () => {
      const formData: StudentFormData = {
        name: '  Apostle Paul  ',
        email: 'paul@hteim.edu',
        levelId: 'level_1',
        cohortId: 'HTEIM-2026',
        enrolledModule: 'General Ministry Studies',
      };

      const summary = createStudentSummaryFromForm(formData);
      expect(summary.name).toBe('Apostle Paul');
      expect(summary.studentNumber).toMatch(/^HTEIM-\d{4}$/);
      expect(summary.rate).toBe(100);
      expect(summary.attended).toBe(0);
    });
  });
});
