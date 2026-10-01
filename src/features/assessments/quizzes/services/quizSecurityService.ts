import { Quiz, QuizQuestion, QuizResponse, QuizAttempt } from '../types/quiz.types';

export class QuizSecurityService {
  /**
   * Sanitizes a quiz before sending to a student or public visitor:
   * Completely strips correct answers, acceptable text answers, explanations, and teacher feedback.
   */
  static scrubQuizForStudent(quiz: Quiz): Quiz {
    if (!quiz) return quiz;

    const scrubbedQuestions: QuizQuestion[] = (quiz.questions || []).map(q => {
      const scrubbedOptions = (q.options || []).map(opt => ({
        id: opt.id,
        text: opt.text
        // strip isCorrect
      }));

      return {
        id: q.id,
        questionText: q.questionText,
        type: q.type,
        options: scrubbedOptions,
        weight: q.weight,
        required: q.required,
        imageUrl: q.imageUrl,
        sectionTitle: q.sectionTitle,
        gradingMode: q.gradingMode,
        topic: q.topic,
        difficulty: q.difficulty,
        // Strip sensitive scoring keys
        correctOptionId: undefined,
        correctOptionIds: undefined,
        acceptableAnswers: undefined,
        explanation: undefined,
        feedbackCorrect: undefined,
        feedbackIncorrect: undefined,
        rubric: q.rubric ? {
          id: q.rubric.id,
          name: q.rubric.name,
          description: q.rubric.description,
          criteria: (q.rubric.criteria || []).map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            weightPercentage: c.weightPercentage,
            maxScore: c.maxScore
          }))
        } : undefined
      };
    });

    return {
      ...quiz,
      questions: scrubbedQuestions
    };
  }

  /**
   * Generates a clean, unambiguous share token (e.g. "qz_7k9m2p").
   */
  static generateShareToken(length = 8): string {
    const charset = '23456789abcdefghjkmnpqrstuvwxyz'; // safe chars without ambiguous 0, o, 1, l, i
    let result = '';
    const randomValues = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomValues);
      for (let i = 0; i < length; i++) {
        result += charset[randomValues[i] % charset.length];
      }
    } else {
      for (let i = 0; i < length; i++) {
        result += charset[Math.floor(Math.random() * charset.length)];
      }
    }
    return `qz_${result}`;
  }

  /**
   * Sanitizes student responses when grades are released according to quiz settings:
   * Only includes correct answer hints and explanations if permitted by settings.
   */
  static formatReleasedResponses(
    attempt: QuizAttempt,
    quiz: Quiz
  ): QuizResponse[] {
    const showAnswers = quiz.settings?.showCorrectAnswers !== false;
    const showFeedback = quiz.settings?.showFeedback !== false;

    const questionMap = new Map<string, QuizQuestion>();
    (quiz.questions || []).forEach(q => questionMap.set(q.id, q));

    return attempt.responses.map(resp => {
      const q = questionMap.get(resp.questionId);

      return {
        ...resp,
        correctOptionId: showAnswers ? q?.correctOptionId : undefined,
        correctOptionIds: showAnswers ? q?.correctOptionIds : undefined,
        acceptableAnswers: showAnswers ? q?.acceptableAnswers : undefined,
        explanation: showFeedback ? q?.explanation : undefined,
        feedbackCorrect: showFeedback ? q?.feedbackCorrect : undefined,
        feedbackIncorrect: showFeedback ? q?.feedbackIncorrect : undefined
      };
    });
  }
}
