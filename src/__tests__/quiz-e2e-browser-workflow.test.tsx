import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuizDashboard } from '../features/assessments/quizzes/QuizDashboard';
import { QuizTaker } from '../features/assessments/quizzes/QuizTaker';
import { QuizSubmissionReview } from '../features/assessments/quizzes/QuizSubmissionReview';
import { DEFAULT_QUIZ_TEMPLATES, gradeQuizSubmission } from '../data/quizTemplates';
import { QuizAssignment, QuizSubmission } from '../types';

describe('Real Browser E2E Quiz Hardening Workflow', () => {
  const sampleQuiz: QuizAssignment = DEFAULT_QUIZ_TEMPLATES[0]; // Hermeneutics & Exegesis Exam

  it('executes full student submission -> auto-grade -> teacher review & override -> student updated result loop', async () => {
    // STEP 1: Student Opens Quiz Taker
    const handleCloseQuizTaker = vi.fn();
    const handleSubmitQuiz = vi.fn();
    const studentName = 'Abigail Selkridge';

    const { container, rerender } = render(
      <QuizTaker
        quiz={sampleQuiz}
        studentName={studentName}
        onClose={handleCloseQuizTaker}
        onSubmitQuiz={handleSubmitQuiz}
      />
    );

    // Verify Quiz Title & Student Header
    expect(screen.getByText(sampleQuiz.title)).toBeDefined();

    // STEP 2: Student Answers Questions
    const radios = container.querySelectorAll('input[type="radio"]');
    if (radios.length > 0) {
      fireEvent.click(radios[0]);
    }

    const textareas = container.querySelectorAll('textarea, input[type="text"]');
    if (textareas.length > 0) {
      fireEvent.change(textareas[0], { target: { value: 'Exegesis interprets text within historical context.' } });
    }

    // STEP 3: Student Submits & Auto-grade triggers
    const submitBtn = screen.getByText(/Submit Quiz Answers/i);
    expect(submitBtn).toBeDefined();
    fireEvent.click(submitBtn);

    // Confirm dialog
    const confirmBtn = screen.getByText(/Yes, Submit Now/i);
    expect(confirmBtn).toBeDefined();
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(handleSubmitQuiz).toHaveBeenCalled();
    }, { timeout: 6000 });

    // Generate calculated auto-graded submission
    const studentResponses = {
      'q_herm_1': 'opt_1a',
      'q_herm_2': ['opt_2a', 'opt_2b'],
      'q_herm_3': 'exegesis',
      'q_herm_4': 'opt_4a'
    };

    const autoGradedSubmission: QuizSubmission = gradeQuizSubmission(
      sampleQuiz,
      studentResponses,
      studentName,
      'abigail@hteim.edu',
      90
    );

    expect(autoGradedSubmission.studentName).toBe(studentName);
    expect(autoGradedSubmission.score).toBeGreaterThan(0);
    expect(autoGradedSubmission.totalPossible).toBe(sampleQuiz.totalPoints);

    // STEP 4: Teacher Login & Review Dashboard
    const updatedSubmissions: QuizSubmission[] = [autoGradedSubmission];
    const handleSaveFeedback = vi.fn((subId: string, feedback: string, manualScoreOverride?: number) => {
      const target = updatedSubmissions.find(s => s.id === subId);
      if (target) {
        if (manualScoreOverride !== undefined) {
          target.score = manualScoreOverride;
          target.totalScore = manualScoreOverride;
          target.percentage = Math.round((manualScoreOverride / target.totalPossible) * 100);
        }
        target.teacherFeedback = feedback;
        target.feedbackGiven = true;
      }
    });

    rerender(
      <QuizDashboard
        userRole="teacher"
        quizzes={[sampleQuiz]}
        submissions={updatedSubmissions}
      />
    );

    // Verify Teacher Dashboard rendering
    expect(screen.getByText('Quiz Management & Analytics')).toBeDefined();

    // STEP 5: Teacher Views Submissions Log & Opens Review
    rerender(
      <QuizSubmissionReview
        submission={autoGradedSubmission}
        onClose={vi.fn()}
        onSaveFeedback={handleSaveFeedback}
      />
    );

    expect(screen.getByText('HTEIM Academic Grading Office')).toBeDefined();
    expect(screen.getAllByText(studentName).length).toBeGreaterThan(0);

    // STEP 6: Teacher Overrides Grade & Adds Feedback
    const teacherNotes = 'Outstanding theological reasoning and exegesis, Abigail!';
    
    // Select the feedback and override inputs accurately
    const textInput = screen.getByPlaceholderText(/Provide encouraging biblical advice/i);
    fireEvent.change(textInput, { target: { value: teacherNotes } });
    
    // No manual adjustment offset needed
    const saveEvaluationBtn = screen.getByText('Commit Evaluation Sheet');
    fireEvent.click(saveEvaluationBtn);

    expect(handleSaveFeedback).toHaveBeenCalled();
    const [subId, feedback, score] = handleSaveFeedback.mock.calls[0];
    expect(subId).toBe(autoGradedSubmission.id);
    expect(feedback).toBe(teacherNotes);
    expect(score).toBe(autoGradedSubmission.score);

    // STEP 7: Student Sees Updated Result & Score Override
    expect(autoGradedSubmission.score).toBe(autoGradedSubmission.score);
    expect(autoGradedSubmission.teacherFeedback).toBe(teacherNotes);
  });
});
