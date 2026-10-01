import { useState, useCallback } from 'react';
import {
  Quiz,
  QuizAttempt,
  QuizResponse,
  QuizGrade,
  GradingStatus
} from '../types/quiz.types';
import { QuizScoringService } from '../services/quizScoringService';
import { UserRole } from '../../../../types/rbac';

export interface UseQuizGradingProps {
  quiz: Quiz;
  initialAttempt: QuizAttempt;
  userRole: UserRole;
  onSaveGrade?: (attempt: QuizAttempt, grade: QuizGrade) => Promise<void> | void;
}

export function useQuizGrading({
  quiz,
  initialAttempt,
  userRole,
  onSaveGrade
}: UseQuizGradingProps) {
  const [attempt, setAttempt] = useState<QuizAttempt>(initialAttempt);
  const [activeQuestionId, setActiveQuestionId] = useState<string>(
    initialAttempt.responses[0]?.questionId || quiz.questions[0]?.id || ''
  );
  const [overallFeedback, setOverallFeedback] = useState<string>(
    initialAttempt.teacherFeedback || initialAttempt.feedback || ''
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Update a single question's teacher override score or feedback
  const updateQuestionGrade = useCallback((
    questionId: string,
    updates: {
      teacherScore?: number;
      teacherFeedback?: string;
      rubricEvaluation?: Record<string, number>;
    }
  ) => {
    setAttempt(prev => {
      const q = (quiz.questions || []).find(item => item.id === questionId);
      const existingResp = prev.responses.find(r => r.questionId === questionId);
      const maxWeight = Number(q?.weight) || 10;

      let rubricTotal: number | undefined;
      if (updates.rubricEvaluation && q?.rubric) {
        rubricTotal = QuizScoringService.calculateRubricScore(q.rubric, updates.rubricEvaluation, maxWeight);
      }

      const effectiveScore = updates.teacherScore !== undefined
        ? updates.teacherScore
        : rubricTotal !== undefined
        ? rubricTotal
        : (existingResp?.finalScore || existingResp?.autoScore || 0);

      const updatedResponses: QuizResponse[] = prev.responses.map(r => {
        if (r.questionId !== questionId) return r;
        return {
          ...r,
          teacherScore: updates.teacherScore !== undefined ? updates.teacherScore : r.teacherScore,
          finalScore: effectiveScore,
          teacherFeedback: updates.teacherFeedback !== undefined ? updates.teacherFeedback : r.teacherFeedback,
          rubricEvaluation: updates.rubricEvaluation !== undefined ? updates.rubricEvaluation : r.rubricEvaluation,
          isCorrect: effectiveScore >= maxWeight * 0.75
        };
      });

      // Recalculate total
      const newTotalScore = updatedResponses.reduce((sum, r) => sum + (r.finalScore || 0), 0);
      const maxPoints = prev.maxPoints || 100;
      const newPercentage = Math.min(100, Math.round((newTotalScore / maxPoints) * 100));

      return {
        ...prev,
        score: newTotalScore,
        percentage: newPercentage,
        gradingStatus: 'teacher_reviewed',
        responses: updatedResponses
      };
    });
    setSaveSuccess(false);
  }, [quiz.questions]);

  // Save all teacher grades and feedback
  const saveGrades = useCallback(async () => {
    setIsSaving(true);
    try {
      const gradeRecord: QuizGrade = {
        id: `grade_${attempt.id}`,
        attemptId: attempt.id,
        quizId: attempt.quizId,
        studentId: attempt.studentId,
        autoScore: attempt.responses.reduce((sum, r) => sum + (r.autoScore || 0), 0),
        teacherScore: attempt.score,
        maxPoints: attempt.maxPoints,
        percentage: attempt.percentage,
        gradeStatus: 'teacher_reviewed',
        gradedBy: userRole,
        gradedAt: new Date().toISOString()
      };

      const finalAttempt: QuizAttempt = {
        ...attempt,
        teacherFeedback: overallFeedback,
        gradingStatus: 'teacher_reviewed'
      };

      if (onSaveGrade) {
        await onSaveGrade(finalAttempt, gradeRecord);
      }
      setAttempt(finalAttempt);
      setSaveSuccess(true);
    } catch (err) {
      console.error('Error saving grades', err);
    } finally {
      setIsSaving(false);
    }
  }, [attempt, overallFeedback, userRole, onSaveGrade]);

  // Release Grade to student
  const releaseGrade = useCallback(async () => {
    setIsSaving(true);
    try {
      const releasedAttempt: QuizAttempt = {
        ...attempt,
        gradingStatus: 'RELEASED' as any,
        releasedAt: new Date().toISOString(),
        teacherFeedback: overallFeedback
      };

      const gradeRecord: QuizGrade = {
        id: `grade_${attempt.id}`,
        attemptId: attempt.id,
        quizId: attempt.quizId,
        studentId: attempt.studentId,
        autoScore: attempt.responses.reduce((sum, r) => sum + (r.autoScore || 0), 0),
        releasedScore: attempt.score,
        maxPoints: attempt.maxPoints,
        percentage: attempt.percentage,
        gradeStatus: 'released',
        releasedBy: userRole,
        releasedAt: new Date().toISOString()
      };

      if (onSaveGrade) {
        await onSaveGrade(releasedAttempt, gradeRecord);
      }
      setAttempt(releasedAttempt);
      setSaveSuccess(true);
    } catch (err) {
      console.error('Error releasing grade', err);
    } finally {
      setIsSaving(false);
    }
  }, [attempt, overallFeedback, userRole, onSaveGrade]);

  return {
    attempt,
    activeQuestionId,
    setActiveQuestionId,
    overallFeedback,
    setOverallFeedback,
    isSaving,
    saveSuccess,
    updateQuestionGrade,
    saveGrades,
    releaseGrade
  };
}
