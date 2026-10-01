import { describe, it, expect } from 'vitest';
import {
  QuizValidationService,
  QuizLifecycleService,
  QuizScoringService,
  QuizSecurityService,
  QuizVersionService,
  QuizAnalyticsService,
  QuestionPoolService,
  Quiz,
  QuizQuestion,
  QuizAttempt
} from '../features/assessments/quizzes';

describe('Canonical Quiz & Assessment Engine Specification Tests', () => {

  const sampleQuiz: Quiz = {
    id: 'quiz_herm_101',
    title: 'Biblical Hermeneutics Exam',
    description: 'Midterm assessment on biblical interpretation principles.',
    instructions: 'Please answer all questions thoroughly.',
    courseCode: 'MIN-101',
    moduleTrack: 'Biblical Hermeneutics',
    category: 'Scripture Knowledge',
    createdBy: 'Dr. Gillian Selkridge',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    status: 'OPEN',
    currentVersionId: 'ver_quiz_herm_101_v1',
    isPublished: true,
    shareCode: 'qz_herm101',
    totalPoints: 50,
    settings: {
      timeLimitMinutes: 30,
      passingScorePercentage: 75,
      allowMultipleAttempts: true,
      maxAttempts: 2,
      gradeCalculation: 'highest',
      gradeReleasePolicy: 'immediate',
      showCorrectAnswers: true,
      showFeedback: true
    },
    questions: [
      {
        id: 'q1_mc',
        questionText: 'What is the literal meaning of the Greek word "hermeneuo"?',
        type: 'multiple_choice',
        options: [
          { id: 'opt_1a', text: 'To interpret, explain, or translate' },
          { id: 'opt_1b', text: 'To memorize and recite' },
          { id: 'opt_1c', text: 'To write or record' }
        ],
        correctOptionId: 'opt_1a',
        weight: 10,
        explanation: 'Hermeneuo is the root of hermeneutics.'
      },
      {
        id: 'q2_cb',
        questionText: 'Which methods belong to sound exegesis? (Select all that apply)',
        type: 'checkboxes',
        options: [
          { id: 'opt_2a', text: 'Historical Context' },
          { id: 'opt_2b', text: 'Grammatical Analysis' },
          { id: 'opt_2c', text: 'Eisegesis' }
        ],
        correctOptionIds: ['opt_2a', 'opt_2b'],
        weight: 10
      },
      {
        id: 'q3_sa',
        questionText: 'What term describes drawing out the author\'s intended meaning from the text?',
        type: 'short_answer',
        options: [],
        acceptableAnswers: ['exegesis', 'exegetical analysis'],
        weight: 10
      },
      {
        id: 'q4_tf',
        questionText: 'Scripture interprets scripture within covenant context.',
        type: 'true_false',
        options: [
          { id: 'opt_4t', text: 'True' },
          { id: 'opt_4f', text: 'False' }
        ],
        correctOptionId: 'opt_4t',
        weight: 10
      },
      {
        id: 'q5_essay',
        questionText: 'Explain the Hermeneutical Circle.',
        type: 'paragraph',
        options: [],
        weight: 10,
        rubric: {
          id: 'rub_1',
          name: 'Hermeneutical Circle Rubric',
          criteria: [
            { id: 'crit_depth', name: 'Theological Depth', weightPercentage: 60, maxScore: 10 },
            { id: 'crit_citations', name: 'Scriptural Citations', weightPercentage: 40, maxScore: 10 }
          ]
        }
      }
    ]
  };

  describe('1. Validation Service', () => {
    it('validates a correct quiz with zero errors', () => {
      const res = QuizValidationService.validateQuiz(sampleQuiz);
      expect(res.isValid).toBe(true);
      expect(res.errors.length).toBe(0);
    });

    it('flags missing quiz title', () => {
      const res = QuizValidationService.validateQuiz({ ...sampleQuiz, title: '' });
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.field === 'title')).toBe(true);
    });

    it('flags empty questions array', () => {
      const res = QuizValidationService.validateQuiz({ ...sampleQuiz, questions: [] });
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.field === 'questions')).toBe(true);
    });

    it('flags multiple choice question without a valid correctOptionId', () => {
      const badQ: QuizQuestion = {
        id: 'q_bad',
        questionText: 'Sample?',
        type: 'multiple_choice',
        options: [{ id: 'o1', text: 'One' }, { id: 'o2', text: 'Two' }],
        weight: 10,
        correctOptionId: 'o_non_existent'
      };
      const res = QuizValidationService.validateQuiz({ ...sampleQuiz, questions: [badQ] });
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.field === 'correctOptionId')).toBe(true);
    });

    it('flags invalid time limit (< 1 min or > 360 min)', () => {
      const res = QuizValidationService.validateQuiz({
        ...sampleQuiz,
        settings: { ...sampleQuiz.settings, timeLimitMinutes: 0 }
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.field === 'timeLimitMinutes')).toBe(true);
    });
  });

  describe('2. Scoring Service', () => {
    it('accurately scores correct multiple choice response', () => {
      const resp = QuizScoringService.evaluateResponse(sampleQuiz.questions[0], 'opt_1a');
      expect(resp.isCorrect).toBe(true);
      expect(resp.autoScore).toBe(10);
    });

    it('accurately scores incorrect multiple choice response', () => {
      const resp = QuizScoringService.evaluateResponse(sampleQuiz.questions[0], 'opt_1b');
      expect(resp.isCorrect).toBe(false);
      expect(resp.autoScore).toBe(0);
    });

    it('accurately scores checkboxes (strict all-and-only correct matching)', () => {
      // Perfect match
      const correctResp = QuizScoringService.evaluateResponse(sampleQuiz.questions[1], ['opt_2a', 'opt_2b']);
      expect(correctResp.isCorrect).toBe(true);
      expect(correctResp.autoScore).toBe(10);

      // Incomplete match
      const partialResp = QuizScoringService.evaluateResponse(sampleQuiz.questions[1], ['opt_2a']);
      expect(partialResp.isCorrect).toBe(false);
      expect(partialResp.autoScore).toBe(0);

      // Extra incorrect match
      const extraResp = QuizScoringService.evaluateResponse(sampleQuiz.questions[1], ['opt_2a', 'opt_2b', 'opt_2c']);
      expect(extraResp.isCorrect).toBe(false);
      expect(extraResp.autoScore).toBe(0);
    });

    it('accurately matches short answer with case insensitivity and extra whitespace stripping', () => {
      const resp = QuizScoringService.evaluateResponse(sampleQuiz.questions[2], '  ExEgEsIs  ');
      expect(resp.isCorrect).toBe(true);
      expect(resp.autoScore).toBe(10);
    });

    it('correctly calculates essay rubric score', () => {
      const essayQ = sampleQuiz.questions[4];
      const rubricEval = {
        crit_depth: 8, // 8/10 -> 80% * 60% weight = 4.8
        crit_citations: 10 // 10/10 -> 100% * 40% weight = 4.0
        // Total = 8.8 / 10 = 8.8 pts
      };
      const resp = QuizScoringService.evaluateResponse(essayQ, 'A long essay...', undefined, undefined, rubricEval);
      expect(resp.finalScore).toBe(8.8);
      expect(resp.isCorrect).toBe(true);
    });

    it('aggregates multiple attempts by highest score policy', () => {
      const att1: QuizAttempt = {
        id: 'att_1',
        quizId: sampleQuiz.id,
        quizVersionId: 'v1',
        studentId: 'stud_1',
        studentName: 'Student One',
        attemptNumber: 1,
        status: 'SUBMITTED',
        startedAt: '2026-09-10T10:00:00Z',
        submittedAt: '2026-09-10T10:20:00Z',
        lastSavedAt: '2026-09-10T10:20:00Z',
        timeSpentSeconds: 1200,
        score: 30,
        maxPoints: 50,
        percentage: 60,
        gradingStatus: 'auto_graded',
        responses: []
      };

      const att2: QuizAttempt = {
        ...att1,
        id: 'att_2',
        attemptNumber: 2,
        score: 45,
        percentage: 90
      };

      const result = QuizScoringService.aggregateAttemptScores([att1, att2], 'highest');
      expect(result.finalScore).toBe(45);
      expect(result.finalPercentage).toBe(90);
      expect(result.effectiveAttemptId).toBe('att_2');
    });
  });

  describe('3. Lifecycle & State Transitions', () => {
    it('evaluates effective status of OPEN vs SCHEDULED vs CLOSED vs ARCHIVED', () => {
      const now = new Date('2026-09-15T12:00:00Z');

      const openStatus = QuizLifecycleService.getEffectiveQuizStatus(sampleQuiz, now);
      expect(openStatus).toBe('OPEN');

      const scheduledQuiz: Quiz = {
        ...sampleQuiz,
        availableFrom: '2026-09-20T00:00:00Z'
      };
      expect(QuizLifecycleService.getEffectiveQuizStatus(scheduledQuiz, now)).toBe('SCHEDULED');

      const closedQuiz: Quiz = {
        ...sampleQuiz,
        availableUntil: '2026-09-10T00:00:00Z'
      };
      expect(QuizLifecycleService.getEffectiveQuizStatus(closedQuiz, now)).toBe('CLOSED');

      const archivedQuiz: Quiz = {
        ...sampleQuiz,
        archivedAt: '2026-09-01T00:00:00Z'
      };
      expect(QuizLifecycleService.getEffectiveQuizStatus(archivedQuiz, now)).toBe('ARCHIVED');
    });

    it('enforces maximum allowed attempts limit', () => {
      const existingAttempts: QuizAttempt[] = [
        {
          id: 'att_1',
          quizId: sampleQuiz.id,
          quizVersionId: 'v1',
          studentId: 's1',
          studentName: 'Student',
          attemptNumber: 1,
          status: 'SUBMITTED',
          startedAt: '2026-09-10T10:00:00Z',
          lastSavedAt: '2026-09-10T10:00:00Z',
          timeSpentSeconds: 100,
          score: 40,
          maxPoints: 50,
          percentage: 80,
          gradingStatus: 'auto_graded',
          responses: []
        },
        {
          id: 'att_2',
          quizId: sampleQuiz.id,
          quizVersionId: 'v1',
          studentId: 's1',
          studentName: 'Student',
          attemptNumber: 2,
          status: 'SUBMITTED',
          startedAt: '2026-09-10T11:00:00Z',
          lastSavedAt: '2026-09-10T11:00:00Z',
          timeSpentSeconds: 100,
          score: 45,
          maxPoints: 50,
          percentage: 90,
          gradingStatus: 'auto_graded',
          responses: []
        }
      ];

      const check = QuizLifecycleService.canStartAttempt(sampleQuiz, existingAttempts);
      expect(check.allowed).toBe(false);
      expect(check.reason).toMatch(/maximum allowed attempts/i);
    });
  });

  describe('4. Security & Sanitization', () => {
    it('completely scrubs correctOptionId and acceptableAnswers from student quiz payloads', () => {
      const scrubbed = QuizSecurityService.scrubQuizForStudent(sampleQuiz);
      scrubbed.questions.forEach(q => {
        expect(q.correctOptionId).toBeUndefined();
        expect(q.correctOptionIds).toBeUndefined();
        expect(q.acceptableAnswers).toBeUndefined();
        expect(q.explanation).toBeUndefined();
      });
    });

    it('generates secure, URL-safe share tokens', () => {
      const token = QuizSecurityService.generateShareToken(8);
      expect(token).toMatch(/^qz_[a-z0-9]{8}$/);
    });
  });

  describe('5. Versioning & Immutability', () => {
    it('spawns a new version and marks previous version as immutable', () => {
      const initialVer = QuizVersionService.createInitialVersion(sampleQuiz);
      const quizWithVer: Quiz = { ...sampleQuiz, versions: [initialVer] };

      const modifiedQuestions = sampleQuiz.questions.slice(0, 3);
      const { updatedQuiz, newVersion } = QuizVersionService.createNewVersion(
        quizWithVer,
        modifiedQuestions,
        sampleQuiz.settings,
        'Shortened to 3 questions'
      );

      expect(newVersion.versionNumber).toBe(2);
      expect(updatedQuiz.versions?.length).toBe(2);
      expect(updatedQuiz.versions?.[0].isImmutable).toBe(true);
      expect(updatedQuiz.versions?.[1].isImmutable).toBe(false);
    });
  });

  describe('6. Question Pool Sampling', () => {
    it('samples questions deterministically given an attempt ID seed', () => {
      const pool = sampleQuiz.questions;
      const config = {
        id: 'pool_1',
        poolName: 'Hermeneutics Pool',
        questionCountToPresent: 3,
        randomize: true
      };

      const sample1 = QuestionPoolService.selectQuestionsForAttempt(pool, config, 'attempt_seed_abc');
      const sample2 = QuestionPoolService.selectQuestionsForAttempt(pool, config, 'attempt_seed_abc');
      
      expect(sample1.length).toBe(3);
      expect(sample1.map(q => q.id)).toEqual(sample2.map(q => q.id));
    });
  });

  describe('7. Analytics Summary Generation', () => {
    it('computes accurate pass rate, mean, median and score distribution', () => {
      const attempts: QuizAttempt[] = [
        {
          id: 'att_1',
          quizId: sampleQuiz.id,
          quizVersionId: 'v1',
          studentId: 's1',
          studentName: 'Student 1',
          attemptNumber: 1,
          status: 'SUBMITTED',
          startedAt: '2026-09-10T10:00:00Z',
          submittedAt: '2026-09-10T10:20:00Z',
          lastSavedAt: '2026-09-10T10:20:00Z',
          timeSpentSeconds: 1200,
          score: 45,
          maxPoints: 50,
          percentage: 90,
          gradingStatus: 'auto_graded',
          responses: [
            { questionId: 'q1_mc', autoScore: 10, finalScore: 10, isCorrect: true },
            { questionId: 'q2_cb', autoScore: 10, finalScore: 10, isCorrect: true }
          ]
        },
        {
          id: 'att_2',
          quizId: sampleQuiz.id,
          quizVersionId: 'v1',
          studentId: 's2',
          studentName: 'Student 2',
          attemptNumber: 1,
          status: 'SUBMITTED',
          startedAt: '2026-09-10T10:00:00Z',
          submittedAt: '2026-09-10T10:15:00Z',
          lastSavedAt: '2026-09-10T10:15:00Z',
          timeSpentSeconds: 900,
          score: 30,
          maxPoints: 50,
          percentage: 60,
          gradingStatus: 'auto_graded',
          responses: [
            { questionId: 'q1_mc', autoScore: 0, finalScore: 0, isCorrect: false },
            { questionId: 'q2_cb', autoScore: 10, finalScore: 10, isCorrect: true }
          ]
        }
      ];

      const analytics = QuizAnalyticsService.generateSummary(sampleQuiz, attempts);
      expect(analytics.totalSubmitted).toBe(2);
      expect(analytics.averageScore).toBe(75);
      expect(analytics.passRatePercentage).toBe(50); // 1 passed (90%), 1 failed (60% < 75%)
      expect(analytics.scoreDistribution.length).toBe(5);
    });
  });

});
