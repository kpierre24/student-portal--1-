import { QuizQuestion, QuizPoolConfig } from '../types/quiz.types';

export class QuestionPoolService {
  /**
   * Deterministically selects N questions from a candidate pool based on a seed (e.g. attemptId or studentId),
   * ensuring that refreshing the browser during an attempt yields the exact same questions and order.
   */
  static selectQuestionsForAttempt(
    candidateQuestions: QuizQuestion[],
    poolConfig: QuizPoolConfig,
    attemptId: string
  ): QuizQuestion[] {
    if (!candidateQuestions || candidateQuestions.length === 0) {
      return [];
    }

    const count = Math.min(poolConfig.questionCountToPresent || candidateQuestions.length, candidateQuestions.length);

    if (!poolConfig.randomize) {
      return candidateQuestions.slice(0, count);
    }

    // Pseudo-random deterministic shuffle using attemptId seed
    const seedNumber = this.hashString(attemptId);
    const shuffled = [...candidateQuestions];

    // Seeded Fisher-Yates shuffle
    let currentSeed = seedNumber;
    for (let i = shuffled.length - 1; i > 0; i--) {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      const rnd = currentSeed / 233280;
      const j = Math.floor(rnd * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }

    return shuffled.slice(0, count);
  }

  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}
