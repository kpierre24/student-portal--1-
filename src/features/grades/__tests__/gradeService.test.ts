import { describe, it, expect } from 'vitest';
import { 
  normalizeGradeStage, 
  calculateGradeCategory, 
  getNextLifecycleStages, 
  calculateGradeStats 
} from '../services/gradesService';
import { GradeRecord } from '../types';

describe('gradeService — Business Rules & Lifecycle Validation', () => {
  describe('normalizeGradeStage', () => {
    it('normalizes various status strings to canonical lifecycle stages', () => {
      expect(normalizeGradeStage('submitted')).toBe('SUBMITTED');
      expect(normalizeGradeStage('graded by instructor')).toBe('GRADED');
      expect(normalizeGradeStage('in_moderation')).toBe('MODERATION');
      expect(normalizeGradeStage('released to student')).toBe('RELEASED');
      expect(normalizeGradeStage('locked grade')).toBe('LOCKED');
    });
  });

  describe('calculateGradeCategory', () => {
    it('applies School of Ministry grading scale thresholds', () => {
      expect(calculateGradeCategory(95)).toBe('Honor Roll'); // >= 85
      expect(calculateGradeCategory(85)).toBe('Honor Roll');
      expect(calculateGradeCategory(84)).toBe('Satisfactory'); // 75 - 84
      expect(calculateGradeCategory(75)).toBe('Satisfactory');
      expect(calculateGradeCategory(74)).toBe('At-Risk'); // < 75
      expect(calculateGradeCategory(50)).toBe('At-Risk');
    });
  });

  describe('getNextLifecycleStages', () => {
    it('enforces strict lifecycle workflow transitions (Submitted -> Graded -> Moderation -> Released -> Locked)', () => {
      expect(getNextLifecycleStages('SUBMITTED')).toEqual(['GRADED']);
      expect(getNextLifecycleStages('GRADED')).toEqual(['MODERATION', 'RELEASED']);
      expect(getNextLifecycleStages('MODERATION')).toEqual(['RELEASED', 'GRADED']);
      expect(getNextLifecycleStages('RELEASED')).toEqual(['LOCKED', 'MODERATION']);
      expect(getNextLifecycleStages('LOCKED')).toEqual([]);
    });
  });

  describe('calculateGradeStats', () => {
    const mockGrades: GradeRecord[] = [
      {
        id: 'gr-1',
        submissionId: 'sub-1',
        studentId: 'stu-1',
        studentName: 'Ruth',
        assignmentId: 'asg-1',
        assignmentTitle: 'Hermeneutics Essay',
        courseCode: 'SOM-101',
        score: 90,
        maxPoints: 100,
        percentage: 90,
        status: 'RELEASED',
        updatedAt: '2026-08-01',
      },
      {
        id: 'gr-2',
        submissionId: 'sub-2',
        studentId: 'stu-2',
        studentName: 'Boaz',
        assignmentId: 'asg-1',
        assignmentTitle: 'Hermeneutics Essay',
        courseCode: 'SOM-101',
        score: 70,
        maxPoints: 100,
        percentage: 70,
        status: 'GRADED',
        updatedAt: '2026-08-01',
      },
    ];

    it('calculates average percentage, honor roll ratio, and lifecycle breakdown', () => {
      const stats = calculateGradeStats(mockGrades);

      expect(stats.totalGrades).toBe(2);
      expect(stats.averagePercentage).toBe(80); // (90 + 70) / 2
      expect(stats.honorRollCount).toBe(1);
      expect(stats.atRiskCount).toBe(1);
      expect(stats.releasedCount).toBe(1);
      expect(stats.gradedCount).toBe(1);
    });
  });
});
