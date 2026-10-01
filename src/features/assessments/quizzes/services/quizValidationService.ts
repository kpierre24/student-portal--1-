import { Quiz, QuizQuestion, QuizSettings, QuizValidationResult, QuizValidationError } from '../types/quiz.types';

export class QuizValidationService {
  /**
   * Validates an entire quiz for readiness, correctness, and publication readiness.
   */
  static validateQuiz(quiz: Partial<Quiz>): QuizValidationResult {
    const errors: QuizValidationError[] = [];
    const warnings: string[] = [];

    // 1. Basic Info Validation
    if (!quiz.title || quiz.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Quiz title is required.', severity: 'error' });
    } else if (quiz.title.trim().length < 3) {
      errors.push({ field: 'title', message: 'Quiz title must be at least 3 characters long.', severity: 'error' });
    }

    if (!quiz.courseCode || quiz.courseCode.trim().length === 0) {
      warnings.push('Course code is not specified; default MIN-101 will be assigned.');
    }

    // 2. Questions Validation
    const questions = quiz.questions || [];
    if (questions.length === 0) {
      errors.push({ field: 'questions', message: 'The quiz must contain at least one question before it can be published.', severity: 'error' });
    }

    const seenQuestionIds = new Set<string>();

    questions.forEach((q: QuizQuestion, index: number) => {
      // Question ID uniqueness
      if (!q.id || q.id.trim().length === 0) {
        errors.push({ questionIndex: index, message: `Question #${index + 1} has an invalid or missing ID.`, severity: 'error' });
      } else if (seenQuestionIds.has(q.id)) {
        errors.push({ questionIndex: index, message: `Question #${index + 1} has a duplicate ID '${q.id}'.`, severity: 'error' });
      } else {
        seenQuestionIds.add(q.id);
      }

      // Question Text
      if (!q.questionText || q.questionText.trim().length === 0) {
        errors.push({ questionIndex: index, field: 'questionText', message: `Question #${index + 1} prompt text cannot be empty.`, severity: 'error' });
      }

      // Points / Weight
      const weight = Number(q.weight);
      if (isNaN(weight) || weight <= 0) {
        errors.push({ questionIndex: index, field: 'weight', message: `Question #${index + 1} must have a positive point value (> 0).`, severity: 'error' });
      }

      // Type-Specific Validations
      switch (q.type) {
        case 'multiple_choice':
        case 'true_false': {
          const opts = q.options || [];
          if (opts.length < 2) {
            errors.push({ questionIndex: index, field: 'options', message: `Question #${index + 1} (${q.type}) must have at least 2 options.`, severity: 'error' });
          }
          const hasEmptyOption = opts.some(o => !o.text || o.text.trim().length === 0);
          if (hasEmptyOption) {
            errors.push({ questionIndex: index, field: 'options', message: `Question #${index + 1} has one or more empty option text fields.`, severity: 'error' });
          }
          if (!q.correctOptionId || !opts.some(o => o.id === q.correctOptionId)) {
            errors.push({ questionIndex: index, field: 'correctOptionId', message: `Question #${index + 1} does not have a valid correct option selected.`, severity: 'error' });
          }
          break;
        }

        case 'checkboxes': {
          const opts = q.options || [];
          if (opts.length < 2) {
            errors.push({ questionIndex: index, field: 'options', message: `Checkboxes Question #${index + 1} must have at least 2 options.`, severity: 'error' });
          }
          const correctIds = q.correctOptionIds || [];
          if (correctIds.length === 0) {
            errors.push({ questionIndex: index, field: 'correctOptionIds', message: `Checkboxes Question #${index + 1} must have at least one correct option selected.`, severity: 'error' });
          } else {
            const invalidSelections = correctIds.filter(id => !opts.some(o => o.id === id));
            if (invalidSelections.length > 0) {
              errors.push({ questionIndex: index, field: 'correctOptionIds', message: `Checkboxes Question #${index + 1} contains selected correct options that do not exist.`, severity: 'error' });
            }
          }
          break;
        }

        case 'short_answer':
        case 'fill_blank': {
          const acceptable = q.acceptableAnswers || [];
          if (acceptable.length === 0 || acceptable.every(a => !a || a.trim().length === 0)) {
            errors.push({ questionIndex: index, field: 'acceptableAnswers', message: `Question #${index + 1} (${q.type}) must specify at least one acceptable answer for automatic grading.`, severity: 'error' });
          }
          break;
        }

        case 'paragraph': {
          if (!q.rubric && !q.explanation) {
            warnings.push(`Question #${index + 1} (Essay) does not have an attached rubric or grading guidelines.`);
          }
          break;
        }

        default: {
          errors.push({ questionIndex: index, field: 'type', message: `Question #${index + 1} has an unsupported question type: '${q.type}'.`, severity: 'error' });
          break;
        }
      }
    });

    // 3. Settings Validation
    const settings: QuizSettings = quiz.settings || {};

    if (settings.timeLimitMinutes !== undefined && settings.timeLimitMinutes !== null) {
      const timeVal = Number(settings.timeLimitMinutes);
      if (isNaN(timeVal) || timeVal < 1 || timeVal > 360) {
        errors.push({ field: 'timeLimitMinutes', message: 'Time limit must be between 1 minute and 360 minutes (6 hours).', severity: 'error' });
      }
    }

    if (settings.passingScorePercentage !== undefined && settings.passingScorePercentage !== null) {
      const passVal = Number(settings.passingScorePercentage);
      if (isNaN(passVal) || passVal < 0 || passVal > 100) {
        errors.push({ field: 'passingScorePercentage', message: 'Passing score percentage must be between 0% and 100%.', severity: 'error' });
      }
    }

    if (settings.maxAttempts !== undefined && settings.maxAttempts !== null) {
      const maxAtt = Number(settings.maxAttempts);
      if (isNaN(maxAtt) || maxAtt < 1) {
        errors.push({ field: 'maxAttempts', message: 'Maximum attempts must be a positive integer (at least 1).', severity: 'error' });
      }
    }

    // Date range validation
    if (quiz.availableFrom && quiz.availableUntil) {
      const fromTime = new Date(quiz.availableFrom).getTime();
      const untilTime = new Date(quiz.availableUntil).getTime();
      if (!isNaN(fromTime) && !isNaN(untilTime) && untilTime <= fromTime) {
        errors.push({ field: 'availableUntil', message: 'Available Until date/time must be strictly after Available From date/time.', severity: 'error' });
      }
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings
    };
  }

  /**
   * Fast check for a specific question during authoring.
   */
  static validateQuestion(question: QuizQuestion, index = 0): QuizValidationError[] {
    const subResult = this.validateQuiz({ questions: [question], title: 'Temp' });
    return subResult.errors.filter(e => e.questionIndex === 0 || e.field === 'questions');
  }
}
