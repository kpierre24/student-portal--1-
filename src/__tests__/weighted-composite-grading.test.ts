import { describe, it, expect } from 'vitest';
import { 
  DEFAULT_GRADING_WEIGHTS, 
  validateGradingWeights, 
  calculateWeightedComposite, 
  getDetailedWeightedBreakdown 
} from '../data/gradingWeights';

describe('Weighted Composite Grading Policy & Formula Engine', () => {
  it('validates default syllabus weights without rubric written % (70% Quizzes, 20% Attendance, 10% Scripture)', () => {
    expect(DEFAULT_GRADING_WEIGHTS.quizzes).toBe(70);
    expect(DEFAULT_GRADING_WEIGHTS.attendance).toBe(20);
    expect(DEFAULT_GRADING_WEIGHTS.scriptureRecitation).toBe(10);
    expect(DEFAULT_GRADING_WEIGHTS.assignments).toBe(0);
    expect(validateGradingWeights(DEFAULT_GRADING_WEIGHTS)).toBe(true);
  });

  it('rejects weights that do not sum to 100%', () => {
    expect(validateGradingWeights({ quizzes: 50, attendance: 20, scriptureRecitation: 10 })).toBe(false);
    expect(validateGradingWeights({ quizzes: 30, attendance: 20, scriptureRecitation: 10 })).toBe(false);
    expect(validateGradingWeights(null)).toBe(false);
  });

  it('calculates weighted composite accurately for top student (Honor Roll)', () => {
    const components = {
      quizPct: 90,
      attendancePct: 95,
      scripturePct: 100,
    };
    // Expected calculation:
    // Quizzes: 90 * 0.70 = 63
    // Attendance: 95 * 0.20 = 19
    // Scripture: 100 * 0.10 = 10
    // Total: 63 + 19 + 10 = 92%
    const composite = calculateWeightedComposite(components, DEFAULT_GRADING_WEIGHTS);
    expect(composite).toBe(92);

    const breakdown = getDetailedWeightedBreakdown(components, DEFAULT_GRADING_WEIGHTS);
    expect(breakdown.composite).toBe(92);
    expect(breakdown.letterGrade).toBe('A');
    expect(breakdown.standing).toBe('Honor Roll');
    expect(breakdown.standingColor).toBe('emerald');
    expect(breakdown.components.quizzes.contribution).toBe(63);
    expect(breakdown.components.attendance.contribution).toBe(19);
    expect(breakdown.components.scriptureRecitation.contribution).toBe(10);
  });

  it('confirms rubric written % is not factored into the weighted composite evaluation', () => {
    const withoutRubric = {
      quizPct: 80,
      attendancePct: 90,
      scripturePct: 80,
    };
    const withRubricWrittenLow = {
      ...withoutRubric,
      assignmentPct: 10,
    };
    const withRubricWrittenHigh = {
      ...withoutRubric,
      assignmentPct: 100,
    };

    // Rubric written score has 0 impact on the composite grade
    const compositeBase = calculateWeightedComposite(withoutRubric);
    const compositeLow = calculateWeightedComposite(withRubricWrittenLow);
    const compositeHigh = calculateWeightedComposite(withRubricWrittenHigh);

    expect(compositeLow).toBe(compositeBase);
    expect(compositeHigh).toBe(compositeBase);
  });

  it('calculates weighted composite accurately for satisfactory student', () => {
    const components = {
      quizPct: 75,
      attendancePct: 80,
      scripturePct: 70,
    };
    // Expected:
    // Quizzes: 75 * 0.70 = 52.5
    // Attendance: 80 * 0.20 = 16
    // Scripture: 70 * 0.10 = 7
    // Total: 52.5 + 16 + 7 = 75.5 -> rounded to 76%
    const breakdown = getDetailedWeightedBreakdown(components, DEFAULT_GRADING_WEIGHTS);
    expect(breakdown.composite).toBe(76);
    expect(breakdown.letterGrade).toBe('B');
    expect(breakdown.standing).toBe('Satisfactory');
    expect(breakdown.standingColor).toBe('indigo');
  });

  it('flags at-risk student when composite is below 75%', () => {
    const components = {
      quizPct: 60,
      attendancePct: 60,
      scripturePct: 50,
    };
    // Expected:
    // Quizzes: 60 * 0.70 = 42
    // Attendance: 60 * 0.20 = 12
    // Scripture: 50 * 0.10 = 5
    // Total: 42 + 12 + 5 = 59%
    const breakdown = getDetailedWeightedBreakdown(components, DEFAULT_GRADING_WEIGHTS);
    expect(breakdown.composite).toBe(59);
    expect(breakdown.letterGrade).toBe('F');
    expect(breakdown.standing).toBe('At-Risk');
    expect(breakdown.standingColor).toBe('rose');
  });

  it('supports custom administrator-configured grading weights', () => {
    const customWeights = {
      quizzes: 60,
      attendance: 30,
      scriptureRecitation: 10,
    };
    const components = {
      quizPct: 80,
      attendancePct: 80,
      scripturePct: 80,
    };
    const composite = calculateWeightedComposite(components, customWeights);
    expect(composite).toBe(80);
  });

  it('clamps values cleanly at 0% and 100% bounds', () => {
    const perfectScore = {
      quizPct: 100,
      attendancePct: 100,
      scripturePct: 100,
    };
    expect(calculateWeightedComposite(perfectScore)).toBe(100);

    const zeroScore = {
      quizPct: 0,
      attendancePct: 0,
      scripturePct: 0,
    };
    expect(calculateWeightedComposite(zeroScore)).toBe(0);
  });
});
