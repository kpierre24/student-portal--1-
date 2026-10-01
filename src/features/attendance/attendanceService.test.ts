import { describe, it, expect } from 'vitest';
import {
  calculateAttendanceRate,
  isAtRiskAttendance,
  isCriticalAttendance,
  getSessionStats,
  computeOverallAttendanceStats,
} from './services/attendanceService';
import { StudentSummary, ClassDay } from '../../types';

describe('attendanceService', () => {
  it('calculates attendance rate correctly', () => {
    expect(calculateAttendanceRate(8, 10)).toBe(80);
    expect(calculateAttendanceRate(7, 10)).toBe(70);
    expect(calculateAttendanceRate(5, 10, 2)).toBe(63); // 5 / (10 - 2) = 5/8 = 62.5% -> 63%
    expect(calculateAttendanceRate(0, 0)).toBe(100);
  });

  it('identifies at risk and critical attendance thresholds', () => {
    expect(isAtRiskAttendance(74)).toBe(true);
    expect(isAtRiskAttendance(75)).toBe(false);

    expect(isCriticalAttendance(50)).toBe(true);
    expect(isCriticalAttendance(51)).toBe(false);
  });

  it('computes session stats accurately', () => {
    const mockClassDay: ClassDay = {
      id: 'day_1',
      name: 'Session 1',
      date: '2026-09-10',
    };

    const mockStudents: StudentSummary[] = [
      {
        name: 'Student A',
        totalDays: 1,
        attended: 1,
        rate: 100,
        avgScore: 90,
        levelId: 'level_1',
        attendanceByDay: { day_1: { present: true } },
      },
      {
        name: 'Student B',
        totalDays: 1,
        attended: 0,
        rate: 0,
        avgScore: 70,
        levelId: 'level_1',
        attendanceByDay: { day_1: { present: false } },
      },
    ];

    const stats = getSessionStats(mockClassDay, mockStudents);
    expect(stats.totalStudents).toBe(2);
    expect(stats.presentCount).toBe(1);
    expect(stats.absentCount).toBe(1);
    expect(stats.excusedCount).toBe(0);
    expect(stats.attendanceRate).toBe(50);
  });

  it('computes overall attendance stats for cohort', () => {
    const mockStudents: StudentSummary[] = [
      {
        name: 'Student A',
        totalDays: 10,
        attended: 9,
        rate: 90,
        avgScore: 88,
        levelId: 'level_1',
        attendanceByDay: {},
      },
      {
        name: 'Student B',
        totalDays: 10,
        attended: 6,
        rate: 60,
        avgScore: 70,
        levelId: 'level_1',
        attendanceByDay: {},
      },
    ];

    const overall = computeOverallAttendanceStats(mockStudents, [{ id: 'day_1', name: 'Day 1' }]);
    expect(overall.totalSessions).toBe(1);
    expect(overall.averageRate).toBe(75);
    expect(overall.satisfactoryCount).toBe(1);
    expect(overall.atRiskCount).toBe(1);
  });
});
