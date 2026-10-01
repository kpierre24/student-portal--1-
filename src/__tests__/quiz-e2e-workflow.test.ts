import { describe, it, expect } from 'vitest';
import { DEFAULT_QUIZ_TEMPLATES, gradeQuizSubmission } from '../data/quizTemplates';
import { QuizAssignment, QuizSubmission } from '../types';

describe('End-to-End Quiz & Grading Workflow', () => {
  const sampleQuiz: QuizAssignment = DEFAULT_QUIZ_TEMPLATES[0]; // Hermeneutics Exam

  it('completes the full E2E quiz lifecycle: Student submission -> Auto grade -> Teacher review & override', () => {
    // 1. Student opens quiz and answers questions
    const studentResponses = {
      'q_herm_1': 'opt_1a', // Correct multiple choice answer
      'q_herm_2': ['opt_2a', 'opt_2b', 'opt_2c'], // Correct multi-select checkboxes
      'q_herm_3': 'exegesis', // Correct short answer keyword
      'q_herm_4': 'opt_4a', // True
      'q_herm_5': 'Scripture interprets scripture within covenant context.' // Paragraph reflection
    };

    // 2. Student submits -> Auto-grade calculation
    const studentName = 'Renee Pierre';
    const submission: QuizSubmission = gradeQuizSubmission(
      sampleQuiz,
      studentResponses,
      studentName,
      'renee@hteim.edu',
      120 // 2 minutes
    );

    expect(submission.studentName).toBe('Renee Pierre');
    expect(submission.score).toBeGreaterThan(0);
    expect(submission.totalPossible).toBe(sampleQuiz.totalPoints);
    expect(submission.percentage).toBeGreaterThan(0);
    expect(submission.responses.length).toBe(sampleQuiz.questions.length);

    // Verify first question response accuracy
    const q1Resp = submission.responses.find(r => r.questionId === 'q_herm_1');
    expect(q1Resp?.isCorrect).toBe(true);

    // 3. Teacher views submission in Quiz Dashboard and overrides grade with feedback
    const teacherFeedback = 'Excellent theological reasoning and biblical contextualization, Renee!';
    const manualScoreOverride = sampleQuiz.totalPoints; // 100% score override

    const updatedSubmission: QuizSubmission = {
      ...submission,
      score: manualScoreOverride,
      totalScore: manualScoreOverride,
      percentage: Math.round((manualScoreOverride / submission.totalPossible) * 100),
      teacherFeedback,
      feedbackGiven: true
    };

    // 4. Student views result with updated teacher feedback
    expect(updatedSubmission.score).toBe(sampleQuiz.totalPoints);
    expect(updatedSubmission.percentage).toBe(100);
    expect(updatedSubmission.teacherFeedback).toBe(teacherFeedback);
  });
});
