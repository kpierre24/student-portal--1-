import { Quiz, QuizAttempt, QuizAnalyticsSummary, QuestionPerformanceMetric } from '../types/quiz.types';

export class QuizAnalyticsService {
  /**
   * Generates a comprehensive analytics summary for a quiz given all its attempts.
   */
  static generateSummary(quiz: Quiz, attempts: QuizAttempt[]): QuizAnalyticsSummary {
    const totalAssigned = 1; // can be updated from assignments
    const startedAttempts = attempts.filter(a => a.status !== 'NOT_STARTED');
    const submittedAttempts = attempts.filter(
      a => a.status === 'SUBMITTED' || a.status === 'AUTO_SUBMITTED' || a.status === 'GRADED' || a.status === 'RELEASED'
    );
    const incompleteCount = startedAttempts.length - submittedAttempts.length;

    const scores = submittedAttempts.map(a => Number(a.percentage) || 0);
    const completionTimes = submittedAttempts.map(a => Number(a.timeSpentSeconds) || 0).filter(t => t > 0);

    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    let medianScore = 0;
    if (scores.length > 0) {
      const sorted = [...scores].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      medianScore = sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    }

    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    const passingThreshold = Number(quiz.settings?.passingScorePercentage) || 75;
    const passedCount = scores.filter(s => s >= passingThreshold).length;
    const passRatePercentage = scores.length > 0 ? Math.round((passedCount / scores.length) * 100) : 0;

    const averageCompletionTimeSeconds = completionTimes.length > 0
      ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
      : 0;

    // Score distribution in 5 brackets: 0-59%, 60-69%, 70-79%, 80-89%, 90-100%
    const brackets = [
      { range: '90 - 100%', min: 90, max: 100 },
      { range: '80 - 89%', min: 80, max: 89 },
      { range: '70 - 79%', min: 70, max: 79 },
      { range: '60 - 69%', min: 60, max: 69 },
      { range: '0 - 59%', min: 0, max: 59 },
    ];

    const scoreDistribution = brackets.map(b => {
      const count = scores.filter(s => s >= b.min && s <= b.max).length;
      const percentage = scores.length > 0 ? Math.round((count / scores.length) * 100) : 0;
      return { range: b.range, count, percentage };
    });

    // Question Performance Metrics
    const questionPerformance: QuestionPerformanceMetric[] = (quiz.questions || []).map(q => {
      let totalQuestionAttempts = 0;
      let correctCount = 0;
      let incorrectCount = 0;
      let totalPointsAwarded = 0;
      const wrongAnswersMap = new Map<string, number>();

      submittedAttempts.forEach(att => {
        const resp = (att.responses || []).find(r => r.questionId === q.id);
        if (resp) {
          totalQuestionAttempts++;
          totalPointsAwarded += resp.finalScore || 0;
          if (resp.isCorrect || (resp.finalScore && resp.finalScore >= (Number(q.weight) || 10) * 0.75)) {
            correctCount++;
          } else {
            incorrectCount++;
            const wrongKey = resp.selectedOptionId || resp.textAnswer || (Array.isArray(resp.selectedOptionIds) ? resp.selectedOptionIds.join(', ') : 'No Answer');
            if (wrongKey) {
              wrongAnswersMap.set(wrongKey, (wrongAnswersMap.get(wrongKey) || 0) + 1);
            }
          }
        }
      });

      const correctPercentage = totalQuestionAttempts > 0 ? Math.round((correctCount / totalQuestionAttempts) * 100) : 0;
      const averageQScore = totalQuestionAttempts > 0 ? Math.round((totalPointsAwarded / totalQuestionAttempts) * 10) / 10 : 0;

      let mostCommonWrongAnswer: string | undefined;
      let highestWrongCount = 0;
      wrongAnswersMap.forEach((count, key) => {
        if (count > highestWrongCount) {
          highestWrongCount = count;
          mostCommonWrongAnswer = key;
        }
      });

      // Flags
      const isHighFailureRate = totalQuestionAttempts >= 2 && correctPercentage < 50;
      const isAmbiguous = totalQuestionAttempts >= 4 && highestWrongCount >= (totalQuestionAttempts * 0.4);

      return {
        questionId: q.id,
        questionText: q.questionText,
        type: q.type,
        totalAttempts: totalQuestionAttempts,
        correctCount,
        incorrectCount,
        correctPercentage,
        averageScore: averageQScore,
        maxPoints: Number(q.weight) || 10,
        mostCommonWrongAnswer,
        isHighFailureRate,
        isLowDiscrimination: totalQuestionAttempts >= 4 && (correctPercentage > 95 || correctPercentage < 15),
        isAmbiguous
      };
    });

    return {
      quizId: quiz.id,
      title: quiz.title,
      totalAssigned,
      totalStarted: startedAttempts.length,
      totalSubmitted: submittedAttempts.length,
      incompleteCount,
      averageScore,
      medianScore,
      highestScore,
      lowestScore,
      passRatePercentage,
      averageCompletionTimeSeconds,
      scoreDistribution,
      questionPerformance
    };
  }
}
