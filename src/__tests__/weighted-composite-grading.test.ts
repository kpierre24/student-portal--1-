import { describe, it, expect } from 'vitest';
import { 
  DEFAULT_GRADING_WEIGHTS, 
  validateGradingWeights, 
  calculateWeightedComposite, 
  getDetailedWeightedBreakdown 
} from '../data/gradingWeights';

describe('Weighted Composite Grading Policy & Formula Engine', () => {
  it('validates default syllabus weights (40% Quizzes, 30% Written Assignments, 20% Attendance, 10% Scripture)', () => {
    expect(DEFAULT_GRADING_WEIGHTS).toEqual({
      quizzes: 40,
      assignments: 30,
      attendance: 20,
      scriptureRecitation: 10,
    });
    expect(validateGradingWeights(DEFAULT_GRADING_WEIGHTS)).toBe(true);
  });

  it('rejects weights that do not sum to 100%', () => {
    expect(validateGradingWeights({ quizzes: 50, assignments: 30, attendance: 20, scriptureRecitation: 10 })).toBe(false);
    expect(validateGradingWeights({ quizzes: 30, assignments: 30, attendance: 20, scriptureRecitation: 10 })).toBe(false);
    expect(validateGradingWeights(null)).toBe(false);
  });

  it('calculates weighted composite accurately for top student (Honor Roll)', () => {
    const components = {
      quizPct: 90,
      assignmentPct: 85,
      attendancePct: 95,
      scripturePct: 100,
    };
    // Expected calculation:
    // Quizzes: 90 * 0.40 = 36
    // Assignments: 85 * 0.30 = 25.5
    // Attendance: 95 * 0.20 = 19
    // Scripture: 100 * 0.10 = 10
    // Total: 36 + 25.5 + 19 + 10 = 90.5 -> rounded to 91%
    const composite = calculateWeightedComposite(components, DEFAULT_GRADING_WEIGHTS);
    expect(composite).toBe(91);

    const breakdown = getDetailedWeightedBreakdown(components, DEFAULT_GRADING_WEIGHTS);
    expect(breakdown.composite).toBe(91);
    expect(breakdown.letterGrade).toBe('A');
    expect(breakdown.standing).toBe('Honor Roll');
    expect(breakdown.standingColor).toBe('emerald');
    expect(breakdown.components.quizzes.contribution).toBe(36);
    expect(breakdown.components.assignments.contribution).toBe(25.5);
    expect(breakdown.components.attendance.contribution).toBe(19);
    expect(breakdown.components.scriptureRecitation.contribution).toBe(10);
  });

  it('calculates weighted composite accurately for satisfactory student', () => {
    const components = {
      quizPct: 75,
      assignmentPct: 78,
      attendancePct: 80,
      scripturePct: 70,
    };
    // Expected:
    // Quizzes: 75 * 0.40 = 30
    // Assignments: 78 * 0.30 = 23.4
    // Attendance: 80 * 0.20 = 16
    // Scripture: 70 * 0.10 = 7
    // Total: 30 + 23.4 + 16 + 7 = 76.4 -> rounded to 76%
    const breakdown = getDetailedWeightedBreakdown(components, DEFAULT_GRADING_WEIGHTS);
    expect(breakdown.composite).toBe(76);
    expect(breakdown.letterGrade).toBe('B');
    expect(breakdown.standing).toBe('Satisfactory');
    expect(breakdown.standingColor).toBe('indigo');
  });

  it('flags at-risk student when composite is below 75%', () => {
    const components = {
      quizPct: 60,
      assignmentPct: 65,
      attendancePct: 60,
      scripturePct: 50,
    };
    // Expected:
    // Quizzes: 60 * 0.40 = 24
    // Assignments: 65 * 0.30 = 19.5
    // Attendance: 60 * 0.20 = 12
    // Scripture: 50 * 0.10 = 5
    // Total: 24 + 19.5 + 12 + 5 = 60.5 -> rounded to 61%
    const breakdown = getDetailedWeightedBreakdown(components, DEFAULT_GRADING_WEIGHTS);
    expect(breakdown.composite).toBe(61);
    expect(breakdown.letterGrade).toBe('D');
    expect(breakdown.standing).toBe('At-Risk');
    expect(breakdown.standingColor).toBe('rose');
  });

  it('supports custom administrator-configured grading weights', () => {
    const customWeights = {
      quizzes: 50,
      assignments: 25,
      attendance: 15,
      scriptureRecitation: 10,
    };
    const components = {
      quizPct: 80,
      assignmentPct: 80,
      attendancePct: 80,
      scripturePct: 80,
    };
    const composite = calculateWeightedComposite(components, customWeights);
    expect(composite).toBe(80);
  });

  it('clamps values cleanly at 0% and 100% bounds', () => {
    const perfectScore = {
      quizPct: 100,
      assignmentPct: 100,
      attendancePct: 100,
      scripturePct: 100,
    };
    expect(calculateWeightedComposite(perfectScore)).toBe(100);

    const zeroScore = {
      quizPct: 0,
      assignmentPct: 0,
      attendancePct: 0,
      scripturePct: 0,
    };
    expect(calculateWeightedComposite(zeroScore)).toBe(0);
  });
});
