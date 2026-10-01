/**
 * HTEIM School of Ministry — Weighted Composite Grading Policy & Formula Engine
 */

export interface GradingWeights {
  quizzes: number;             // Quizzes & Module Exams (%)
  assignments: number;         // Written Ministry Assignments & Homework (%)
  attendance: number;          // Class Attendance & Live Sessions (%)
  scriptureRecitation: number; // Scripture Memorization & Practical Ministry (%)
}

export const DEFAULT_GRADING_WEIGHTS: GradingWeights = {
  quizzes: 40,
  assignments: 30,
  attendance: 20,
  scriptureRecitation: 10,
};

export interface StudentGradeComponents {
  quizPct: number;
  assignmentPct: number;
  attendancePct: number;
  scripturePct: number;
}

export interface WeightedGradeBreakdown {
  composite: number;
  letterGrade: string;
  standing: 'Honor Roll' | 'Satisfactory' | 'At-Risk';
  standingColor: string;
  components: {
    quizzes: { rawPct: number; weight: number; contribution: number };
    assignments: { rawPct: number; weight: number; contribution: number };
    attendance: { rawPct: number; weight: number; contribution: number };
    scriptureRecitation: { rawPct: number; weight: number; contribution: number };
  };
  formulaString: string;
}

/**
 * Validates whether the weights are numbers and sum to 100%.
 */
export function validateGradingWeights(weights?: GradingWeights | null): boolean {
  if (!weights) return false;
  const sum = (weights.quizzes || 0) + (weights.assignments || 0) + (weights.attendance || 0) + (weights.scriptureRecitation || 0);
  return Math.abs(sum - 100) < 0.01;
}

/**
 * Safely calculates weighted composite percentage score.
 */
export function calculateWeightedComposite(
  components: StudentGradeComponents,
  weights: GradingWeights = DEFAULT_GRADING_WEIGHTS
): number {
  const w = weights || DEFAULT_GRADING_WEIGHTS;
  const totalWeight = (w.quizzes || 0) + (w.assignments || 0) + (w.attendance || 0) + (w.scriptureRecitation || 0);
  const safeTotal = totalWeight > 0 ? totalWeight : 100;

  const quizContribution = (Math.max(0, Math.min(100, components.quizPct || 0)) * (w.quizzes || 0)) / safeTotal;
  const asgContribution = (Math.max(0, Math.min(100, components.assignmentPct || 0)) * (w.assignments || 0)) / safeTotal;
  const attContribution = (Math.max(0, Math.min(100, components.attendancePct || 0)) * (w.attendance || 0)) / safeTotal;
  const scripContribution = (Math.max(0, Math.min(100, components.scripturePct || 0)) * (w.scriptureRecitation || 0)) / safeTotal;

  return Math.min(100, Math.round(quizContribution + asgContribution + attContribution + scripContribution));
}

/**
 * Returns complete weighted grade breakdown for transparent student and teacher views.
 */
export function getDetailedWeightedBreakdown(
  components: StudentGradeComponents,
  weights: GradingWeights = DEFAULT_GRADING_WEIGHTS
): WeightedGradeBreakdown {
  const w = weights || DEFAULT_GRADING_WEIGHTS;
  const totalWeight = (w.quizzes || 0) + (w.assignments || 0) + (w.attendance || 0) + (w.scriptureRecitation || 0);
  const safeTotal = totalWeight > 0 ? totalWeight : 100;

  const qContrib = Math.round(((components.quizPct * (w.quizzes || 0)) / safeTotal) * 10) / 10;
  const aContrib = Math.round(((components.assignmentPct * (w.assignments || 0)) / safeTotal) * 10) / 10;
  const attContrib = Math.round(((components.attendancePct * (w.attendance || 0)) / safeTotal) * 10) / 10;
  const sContrib = Math.round(((components.scripturePct * (w.scriptureRecitation || 0)) / safeTotal) * 10) / 10;

  const composite = Math.min(100, Math.round(qContrib + aContrib + attContrib + sContrib));

  let letterGrade = 'F';
  if (composite >= 95) letterGrade = 'A+';
  else if (composite >= 90) letterGrade = 'A';
  else if (composite >= 85) letterGrade = 'A-';
  else if (composite >= 80) letterGrade = 'B+';
  else if (composite >= 75) letterGrade = 'B';
  else if (composite >= 70) letterGrade = 'C+';
  else if (composite >= 65) letterGrade = 'C';
  else if (composite >= 60) letterGrade = 'D';

  let standing: 'Honor Roll' | 'Satisfactory' | 'At-Risk' = 'At-Risk';
  let standingColor = 'rose';
  if (composite >= 85) {
    standing = 'Honor Roll';
    standingColor = 'emerald';
  } else if (composite >= 75) {
    standing = 'Satisfactory';
    standingColor = 'indigo';
  }

  const formulaString = `(${components.quizPct}% × ${w.quizzes}%) + (${components.assignmentPct}% × ${w.assignments}%) + (${components.attendancePct}% × ${w.attendance}%) + (${components.scripturePct}% × ${w.scriptureRecitation}%) = ${composite}%`;

  return {
    composite,
    letterGrade,
    standing,
    standingColor,
    components: {
      quizzes: { rawPct: components.quizPct, weight: w.quizzes, contribution: qContrib },
      assignments: { rawPct: components.assignmentPct, weight: w.assignments, contribution: aContrib },
      attendance: { rawPct: components.attendancePct, weight: w.attendance, contribution: attContrib },
      scriptureRecitation: { rawPct: components.scripturePct, weight: w.scriptureRecitation, contribution: sContrib },
    },
    formulaString,
  };
}
