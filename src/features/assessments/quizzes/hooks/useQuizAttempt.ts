import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Quiz,
  QuizAttempt,
  QuizQuestion,
  QuizResponse,
  AttemptStatus
} from '../types/quiz.types';
import { QuizScoringService } from '../services/quizScoringService';
import { QuizLifecycleService } from '../services/quizLifecycleService';

export interface UseQuizAttemptProps {
  quiz: Quiz;
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  existingAttempt?: QuizAttempt | null;
  onAutosave?: (attempt: QuizAttempt) => Promise<void> | void;
  onSubmitAttempt?: (attempt: QuizAttempt) => Promise<QuizAttempt> | QuizAttempt | void;
}

export function useQuizAttempt({
  quiz,
  studentId = 'student_guest',
  studentName = 'HTEIM Student',
  studentEmail = '',
  existingAttempt,
  onAutosave,
  onSubmitAttempt
}: UseQuizAttemptProps) {
  const attemptId = useMemo(() => {
    return existingAttempt?.id || `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  }, [existingAttempt?.id]);

  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [responses, setResponses] = useState<Record<string, any>>(() => {
    if (existingAttempt?.responses) {
      const initial: Record<string, any> = {};
      existingAttempt.responses.forEach(r => {
        initial[r.questionId] = r.selectedOptionId ?? r.selectedOptionIds ?? r.textAnswer ?? r.answer;
      });
      return initial;
    }
    // Check local storage draft
    try {
      const draft = localStorage.getItem(`hteim_quiz_draft_${quiz.id}_${studentId}`);
      if (draft) {
        const parsed = JSON.parse(draft);
        return parsed.responses || {};
      }
    } catch {
      // Ignore local storage parse error
    }
    return {};
  });

  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<AttemptStatus | string>(existingAttempt?.status || 'IN_PROGRESS');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<QuizAttempt | null>(
    (existingAttempt?.status === 'SUBMITTED' || existingAttempt?.status === 'GRADED' || existingAttempt?.status === 'RELEASED')
      ? existingAttempt
      : null
  );

  // Autosave status state
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error' | 'offline'>('saved');
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number>(Date.now());
  const [secondsSinceLastSave, setSecondsSinceLastSave] = useState<number>(0);

  // Timer State
  const startTimeRef = useRef<number>(
    existingAttempt?.startedAt ? new Date(existingAttempt.startedAt).getTime() : Date.now()
  );
  const timeLimitSeconds = quiz.settings?.timeLimitMinutes ? quiz.settings.timeLimitMinutes * 60 : null;

  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(() => {
    if (!timeLimitSeconds) return null;
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    return Math.max(0, timeLimitSeconds - elapsed);
  });

  // Displayed questions (handle shuffle)
  const displayedQuestions = useMemo(() => {
    let qList = [...(quiz.questions || [])];
    if (quiz.settings?.shuffleQuestions) {
      qList = [...qList].sort(() => Math.random() - 0.5);
    }
    if (quiz.settings?.shuffleOptions) {
      qList = qList.map(q => {
        if (q.type === 'multiple_choice' || q.type === 'checkboxes') {
          return {
            ...q,
            options: [...(q.options || [])].sort(() => Math.random() - 0.5)
          };
        }
        return q;
      });
    }
    return qList;
  }, [quiz.questions, quiz.settings?.shuffleQuestions, quiz.settings?.shuffleOptions]);

  // Answer statistics
  const totalQuestions = displayedQuestions.length;
  const answeredCount = useMemo(() => {
    return displayedQuestions.filter(q => {
      const val = responses[q.id];
      if (val === undefined || val === null || val === '') return false;
      if (Array.isArray(val) && val.length === 0) return false;
      return true;
    }).length;
  }, [displayedQuestions, responses]);

  const unansweredCount = totalQuestions - answeredCount;

  // Set single response
  const setQuestionAnswer = useCallback((questionId: string, answer: any) => {
    setResponses(prev => {
      const updated = { ...prev, [questionId]: answer };
      // Save local backup immediately
      try {
        localStorage.setItem(
          `hteim_quiz_draft_${quiz.id}_${studentId}`,
          JSON.stringify({
            quizId: quiz.id,
            studentId,
            responses: updated,
            updatedAt: new Date().toISOString()
          })
        );
      } catch {
        // Non-blocking
      }
      return updated;
    });
    setSaveState('saving');
  }, [quiz.id, studentId]);

  const toggleFlagQuestion = useCallback((questionId: string) => {
    setFlaggedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  }, []);

  // Timer Tick & Expiration Auto-Submit
  useEffect(() => {
    if (status !== 'IN_PROGRESS' || secondsRemaining === null) return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          // Time expired -> trigger auto submission
          handleFinalSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, secondsRemaining]);

  // Seconds since last save ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastSavedTimestamp) / 1000);
      setSecondsSinceLastSave(elapsed);
    }, 1000);
    return () => clearInterval(ticker);
  }, [lastSavedTimestamp]);

  // Debounced cloud autosave
  useEffect(() => {
    if (status !== 'IN_PROGRESS' || saveState !== 'saving') return;

    const debouncedSave = setTimeout(async () => {
      try {
        const attemptObj: QuizAttempt = {
          id: attemptId,
          quizId: quiz.id,
          quizVersionId: quiz.currentVersionId || `ver_${quiz.id}_v1`,
          studentId,
          studentName,
          studentEmail,
          attemptNumber: 1,
          status: 'IN_PROGRESS',
          startedAt: new Date(startTimeRef.current).toISOString(),
          lastSavedAt: new Date().toISOString(),
          timeSpentSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
          score: 0,
          maxPoints: quiz.totalPoints,
          percentage: 0,
          gradingStatus: 'auto_graded',
          responses: Object.entries(responses).map(([qId, ans]) => ({
            questionId: qId,
            answer: ans,
            autoScore: 0,
            finalScore: 0
          }))
        };

        if (onAutosave) {
          await onAutosave(attemptObj);
        }
        setSaveState('saved');
        setLastSavedTimestamp(Date.now());
      } catch (e) {
        setSaveState('error');
      }
    }, 1500);

    return () => clearTimeout(debouncedSave);
  }, [responses, saveState, status, attemptId, quiz, studentId, studentName, studentEmail, onAutosave]);

  // Submit Handler
  const handleFinalSubmit = useCallback(async (isAutoSubmitted = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setStatus(isAutoSubmitted ? 'AUTO_SUBMITTED' : 'SUBMITTED');

    const totalTimeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

    // Evaluate answers
    const graded = QuizScoringService.gradeAttempt(quiz.questions, responses);

    const completedAttempt: QuizAttempt = {
      id: attemptId,
      quizId: quiz.id,
      quizVersionId: quiz.currentVersionId || `ver_${quiz.id}_v1`,
      studentId,
      studentName,
      studentEmail,
      attemptNumber: 1,
      status: isAutoSubmitted ? 'AUTO_SUBMITTED' : 'SUBMITTED',
      startedAt: new Date(startTimeRef.current).toISOString(),
      submittedAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
      timeSpentSeconds: totalTimeSpent,
      autoSubmitted: isAutoSubmitted,
      score: graded.totalScore,
      maxPoints: graded.maxPoints,
      percentage: graded.percentage,
      gradingStatus: 'auto_graded',
      responses: graded.responses
    };

    try {
      if (onSubmitAttempt) {
        const result = await onSubmitAttempt(completedAttempt);
        if (result) {
          setSubmissionResult(result);
        } else {
          setSubmissionResult(completedAttempt);
        }
      } else {
        setSubmissionResult(completedAttempt);
      }
      // Clear draft on successful submission
      try {
        localStorage.removeItem(`hteim_quiz_draft_${quiz.id}_${studentId}`);
      } catch {
        // Non-blocking
      }
    } catch (err) {
      console.error('Submission failed', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, attemptId, quiz, responses, studentId, studentName, studentEmail, onSubmitAttempt]);

  return {
    attemptId,
    activeQuestionIndex,
    setActiveQuestionIndex,
    displayedQuestions,
    responses,
    flaggedQuestions,
    status,
    isSubmitting,
    submissionResult,
    saveState,
    secondsSinceLastSave,
    secondsRemaining,
    totalQuestions,
    answeredCount,
    unansweredCount,
    setQuestionAnswer,
    toggleFlagQuestion,
    handleFinalSubmit
  };
}
