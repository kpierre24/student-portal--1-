import { QuizQuestion, QuizResponse, QuizAttempt, QuizGradeCalculation, QuizRubric } from '../types/quiz.types';

export class QuizScoringService {
  /**
   * Normalizes a text string for fuzzy / lenient short-answer evaluation:
   * trims whitespace, lowercases, removes excessive spaces and punctuation.
   */
  static normalizeText(input: any): string {
    if (typeof input !== 'string') return '';
    return input
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  /**
   * Strips all non-alphanumeric characters for robust comparison of words/keys.
   */
  static cleanAlphaNumeric(input: string): string {
    return input.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Evaluates a single question response authoritatively.
   */
  static evaluateResponse(
    question: QuizQuestion,
    rawAnswer: any,
    manualTeacherScore?: number,
    teacherFeedback?: string,
    rubricEvaluation?: Record<string, number>
  ): QuizResponse {
    const weight = Number(question.weight) || 10;
    let isCorrect = false;
    let autoScore = 0;
    let selectedOptionId: string | undefined;
    let selectedOptionIds: string[] | undefined;
    let textAnswer: string | undefined;

    switch (question.type) {
      case 'multiple_choice':
      case 'true_false': {
        selectedOptionId = typeof rawAnswer === 'string' ? rawAnswer.trim() : undefined;
        if (selectedOptionId && question.correctOptionId && selectedOptionId === question.correctOptionId) {
          isCorrect = true;
          autoScore = weight;
        } else {
          isCorrect = false;
          autoScore = 0;
        }
        break;
      }

      case 'checkboxes': {
        if (Array.isArray(rawAnswer)) {
          selectedOptionIds = rawAnswer.map((id: any) => String(id).trim()).filter(Boolean);
        } else if (typeof rawAnswer === 'string' && rawAnswer.trim()) {
          selectedOptionIds = [rawAnswer.trim()];
        } else {
          selectedOptionIds = [];
        }

        const expectedIds = (question.correctOptionIds || []).map(id => id.trim()).filter(Boolean);
        const givenSet = new Set(selectedOptionIds);
        const expectedSet = new Set(expectedIds);

        // Strict multi-select correctness: must match all correct options and no incorrect options
        const matchesAll = expectedIds.every(id => givenSet.has(id));
        const noExtra = selectedOptionIds.every(id => expectedSet.has(id));

        if (matchesAll && noExtra && expectedIds.length > 0) {
          isCorrect = true;
          autoScore = weight;
        } else {
          isCorrect = false;
          autoScore = 0;
        }
        break;
      }

      case 'short_answer':
      case 'fill_blank': {
        textAnswer = typeof rawAnswer === 'string' ? rawAnswer.trim() : '';
        const normalizedGiven = this.normalizeText(textAnswer);
        const cleanGiven = this.cleanAlphaNumeric(textAnswer);

        const acceptableList = question.acceptableAnswers || [];
        const isMatch = acceptableList.some(acc => {
          const normAcc = this.normalizeText(acc);
          const cleanAcc = this.cleanAlphaNumeric(acc);
          return (
            normAcc === normalizedGiven ||
            (cleanAcc.length > 0 && cleanAcc === cleanGiven)
          );
        });

        if (isMatch) {
          isCorrect = true;
          autoScore = weight;
        } else {
          isCorrect = false;
          autoScore = 0;
        }
        break;
      }

      case 'paragraph': {
        textAnswer = typeof rawAnswer === 'string' ? rawAnswer.trim() : '';
        // Open-ended essay default auto-score:
        // By default, open-ended responses require instructor grading or rubric evaluation.
        autoScore = 0;
        isCorrect = false;
        break;
      }

      default: {
        autoScore = 0;
        isCorrect = false;
        break;
      }
    }

    // Determine final score: teacher override > rubric evaluation > auto score
    let finalScore = autoScore;

    if (rubricEvaluation && question.rubric) {
      const rubricTotal = this.calculateRubricScore(question.rubric, rubricEvaluation, weight);
      finalScore = rubricTotal;
    }

    if (manualTeacherScore !== undefined && manualTeacherScore !== null && !isNaN(manualTeacherScore)) {
      finalScore = Math.max(0, Math.min(weight, Number(manualTeacherScore)));
      if (finalScore >= weight * 0.75) {
        isCorrect = true;
      }
    }

    return {
      questionId: question.id,
      answer: rawAnswer,
      selectedOptionId,
      selectedOptionIds,
      textAnswer,
      autoScore,
      teacherScore: manualTeacherScore,
      finalScore,
      isCorrect: finalScore >= weight * 0.75 || isCorrect,
      teacherFeedback: teacherFeedback || undefined,
      rubricEvaluation,
      savedAt: new Date().toISOString()
    };
  }

  /**
   * Calculates the weighted score from an essay rubric evaluation.
   */
  static calculateRubricScore(rubric: QuizRubric, evaluation: Record<string, number>, maxQuestionWeight: number): number {
    if (!rubric.criteria || rubric.criteria.length === 0) return 0;

    let totalWeightedScore = 0;
    let totalWeightPercentage = 0;

    rubric.criteria.forEach((criterion, idx) => {
      const key = criterion.id || criterion.name || `crit_${idx}`;
      const awarded = evaluation[key] ?? evaluation[criterion.name] ?? 0;
      const criterionMax = criterion.maxScore || 10;
      const weightPct = criterion.weightPercentage || (100 / rubric.criteria.length);

      const ratio = Math.min(1, Math.max(0, awarded / criterionMax));
      totalWeightedScore += ratio * (weightPct / 100);
      totalWeightPercentage += weightPct;
    });

    const normalizedRatio = totalWeightPercentage > 0 ? (totalWeightedScore / (totalWeightPercentage / 100)) : 0;
    const computedScore = Math.round(normalizedRatio * maxQuestionWeight * 10) / 10;
    return Math.min(maxQuestionWeight, computedScore);
  }

  /**
   * Grades a complete attempt authoritatively based on a set of questions and raw answers.
   */
  static gradeAttempt(
    questions: QuizQuestion[],
    rawAnswers: Record<string, any>,
    manualOverrides?: Record<string, { score?: number; feedback?: string; rubric?: Record<string, number> }>
  ): {
    responses: QuizResponse[];
    totalScore: number;
    maxPoints: number;
    percentage: number;
  } {
    const responses: QuizResponse[] = [];
    let totalScore = 0;
    let maxPoints = 0;

    questions.forEach(q => {
      const weight = Number(q.weight) || 10;
      maxPoints += weight;
      const ans = rawAnswers[q.id];
      const override = manualOverrides?.[q.id];

      const evaluated = this.evaluateResponse(
        q,
        ans,
        override?.score,
        override?.feedback,
        override?.rubric
      );

      responses.push(evaluated);
      totalScore += evaluated.finalScore;
    });

    const effectiveMax = maxPoints > 0 ? maxPoints : 100;
    const percentage = Math.min(100, Math.round((totalScore / effectiveMax) * 100));

    return {
      responses,
      totalScore,
      maxPoints: effectiveMax,
      percentage
    };
  }

  /**
   * Aggregates multiple attempts according to the configured calculation policy
   * ('highest' | 'latest' | 'average' | 'first').
   */
  static aggregateAttemptScores(
    attempts: QuizAttempt[],
    policy: QuizGradeCalculation = 'highest'
  ): { finalScore: number; finalPercentage: number; effectiveAttemptId?: string } {
    const validAttempts = attempts.filter(
      a => a.status === 'SUBMITTED' || a.status === 'AUTO_SUBMITTED' || a.status === 'GRADED' || a.status === 'RELEASED'
    );

    if (validAttempts.length === 0) {
      return { finalScore: 0, finalPercentage: 0 };
    }

    switch (policy) {
      case 'first': {
        const sorted = [...validAttempts].sort(
          (a, b) => new Date(a.startedAt || 0).getTime() - new Date(b.startedAt || 0).getTime()
        );
        const first = sorted[0];
        return {
          finalScore: first.score,
          finalPercentage: first.percentage,
          effectiveAttemptId: first.id
        };
      }

      case 'latest': {
        const sorted = [...validAttempts].sort(
          (a, b) => new Date(b.submittedAt || b.startedAt || 0).getTime() - new Date(a.submittedAt || a.startedAt || 0).getTime()
        );
        const latest = sorted[0];
        return {
          finalScore: latest.score,
          finalPercentage: latest.percentage,
          effectiveAttemptId: latest.id
        };
      }

      case 'average': {
        const sumScores = validAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
        const sumPercentages = validAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0);
        const count = validAttempts.length;
        return {
          finalScore: Math.round((sumScores / count) * 10) / 10,
          finalPercentage: Math.round(sumPercentages / count)
        };
      }

      case 'highest':
      default: {
        let best = validAttempts[0];
        validAttempts.forEach(att => {
          if ((att.percentage || 0) > (best.percentage || 0)) {
            best = att;
          }
        });
        return {
          finalScore: best.score,
          finalPercentage: best.percentage,
          effectiveAttemptId: best.id
        };
      }
    }
  }
}
