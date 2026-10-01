import { useState, useEffect, useCallback } from 'react';
import { QuizAssignment, QuizAttempt, CustomAssignment } from '../../../types';
import { DEFAULT_QUIZ_TEMPLATES, gradeQuizAttempt } from '../../../data/quizTemplates';
import { supabase } from '../../../lib/supabaseClient';

export interface UseQuizManagementReturn {
  quizzes: QuizAssignment[];
  attempts: QuizAttempt[];
  isLoading: boolean;
  isSyncing: boolean;
  saveQuiz: (quiz: QuizAssignment) => Promise<void>;
  deleteQuiz: (quizId: string) => Promise<void>;
  duplicateQuiz: (quiz: QuizAssignment) => Promise<QuizAssignment>;
  submitQuizResponse: (
    quiz: QuizAssignment,
    responses: Record<string, any>,
    studentName: string,
    studentEmail?: string,
    timeSpentSeconds?: number
  ) => Promise<QuizAttempt>;
  updateTeacherFeedback: (
    attemptId: string,
    feedback: string,
    manualScoreOverride?: number,
    updatedAttempt?: Partial<QuizAttempt>
  ) => Promise<void>;
  saveDraft: (quizId: string, studentName: string, responses: Record<string, any>, email?: string) => void;
  getDraft: (quizId: string, studentName: string) => { responses: Record<string, any>; email?: string; savedAt?: string } | null;
  clearDraft: (quizId: string, studentName: string) => void;
  syncOfflineQueue: () => Promise<void>;
}

const LOCAL_STORAGE_QUIZZES_KEY = 'hteim_custom_assignments';
const LOCAL_STORAGE_ATTEMPTS_KEY = 'hteim_quiz_attempts';
const LOCAL_STORAGE_OFFLINE_QUEUE_KEY = 'hteim_quiz_offline_queue';

export function useQuizManagement(
  initialAssignments?: CustomAssignment[],
  onAssignmentsChange?: (updated: CustomAssignment[]) => void
): UseQuizManagementReturn {
  const [quizzes, setQuizzes] = useState<QuizAssignment[]>(() => {
    if (initialAssignments && initialAssignments.length > 0) {
      const qList = initialAssignments.filter(a => a.type === 'quiz' || a.quizData).map(a => a.quizData || {
        id: a.id,
        title: a.title,
        courseCode: a.courseCode,
        moduleTrack: a.moduleTrack,
        description: a.description,
        totalPoints: a.maxPoints,
        createdAt: a.createdAt || new Date().toISOString().split('T')[0],
        dueDate: a.dueDate,
        shareCode: a.quizData?.shareCode || (a as any).shareCode || `qz_${a.id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`,
        questions: []
      });
      if (qList.length > 0) return qList;
    }

    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_QUIZZES_KEY);
      if (saved) {
        const parsed: CustomAssignment[] = JSON.parse(saved);
        const extracted = parsed.filter(a => a.type === 'quiz' && a.quizData).map(a => a.quizData!);
        if (extracted.length > 0) return extracted;
      }
    } catch {
      // fallback
    }

    return [];
  });

  const [attempts, setAttempts] = useState<QuizAttempt[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_ATTEMPTS_KEY);
      if (saved) return JSON.parse(saved);
      
      const legacy = localStorage.getItem('hteim_quiz_submissions');
      if (legacy) return JSON.parse(legacy);
    } catch {
      // ignore
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Sync state to local storage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_ATTEMPTS_KEY, JSON.stringify(attempts));
    } catch {
      // ignore
    }
  }, [attempts]);

  // Listen for quiz attempts submitted anywhere in the portal or other browser tabs
  useEffect(() => {
    const handleQuizSubmitted = (e: any) => {
      if (e.detail && e.detail.id) {
        setAttempts(prev => {
          const filtered = prev.filter(s => s.id !== e.detail.id);
          return [e.detail, ...filtered];
        });
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_ATTEMPTS_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setAttempts(parsed);
          }
        } catch {}
      }
    };

    window.addEventListener('hteim_quiz_submitted', handleQuizSubmitted);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('hteim_quiz_submitted', handleQuizSubmitted);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Sync to database if Supabase is connected
  const syncAttemptToDatabase = async (attempt: QuizAttempt) => {
    if (!supabase) return;
    try {
      setIsSyncing(true);
      const { error } = await supabase.from('quiz_attempts').upsert({
        id: attempt.id,
        quiz_id: attempt.quizId,
        quiz_version_id: attempt.quizVersionId,
        quiz_title: attempt.quizTitle,
        student_name: attempt.studentName,
        student_email: attempt.studentEmail,
        score: attempt.score,
        max_points: attempt.maxPoints,
        score_percentage: attempt.scorePercentage,
        responses: attempt.responses,
        status: attempt.status,
        submitted_at: attempt.submittedAt,
        time_spent_seconds: attempt.timeSpentSeconds,
        updated_at: new Date().toISOString()
      });

      if (error) {
        const queue = JSON.parse(localStorage.getItem(LOCAL_STORAGE_OFFLINE_QUEUE_KEY) || '[]');
        queue.push(attempt);
        localStorage.setItem(LOCAL_STORAGE_OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      }
    } catch {
      // Offline fallback
    } finally {
      setIsSyncing(false);
    }
  };

  const saveQuiz = useCallback(async (quiz: QuizAssignment) => {
    setQuizzes(prev => {
      const idx = prev.findIndex(q => q.id === quiz.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = quiz;
        return updated;
      }
      return [quiz, ...prev];
    });

    const customAsgObj: CustomAssignment = {
      id: quiz.id,
      title: quiz.title,
      courseCode: quiz.courseCode,
      moduleTrack: quiz.moduleTrack,
      description: quiz.description || '',
      dueDate: quiz.dueDate || '2026-09-30',
      maxPoints: quiz.totalPoints || 100,
      createdAt: quiz.createdAt,
      type: 'quiz',
      quizData: quiz
    };

    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_QUIZZES_KEY);
      const parsed: CustomAssignment[] = saved ? JSON.parse(saved) : [];
      const idx = parsed.findIndex(a => a.id === quiz.id || a.quizData?.id === quiz.id);
      let updatedList: CustomAssignment[];
      if (idx >= 0) {
        updatedList = [...parsed];
        updatedList[idx] = customAsgObj;
      } else {
        updatedList = [customAsgObj, ...parsed];
      }
      localStorage.setItem(LOCAL_STORAGE_QUIZZES_KEY, JSON.stringify(updatedList));
    } catch {
      // ignore
    }

    if (onAssignmentsChange) {
      const customList = initialAssignments || [];
      const idx = customList.findIndex(a => a.id === quiz.id);
      let updatedCustom: CustomAssignment[];
      if (idx >= 0) {
        updatedCustom = [...customList];
        updatedCustom[idx] = customAsgObj;
      } else {
        updatedCustom = [customAsgObj, ...customList];
      }
      onAssignmentsChange(updatedCustom);
    }
  }, [initialAssignments, onAssignmentsChange]);

  const deleteQuiz = useCallback(async (quizId: string) => {
    setQuizzes(prev => prev.filter(q => q.id !== quizId));
    if (onAssignmentsChange && initialAssignments) {
      onAssignmentsChange(initialAssignments.filter(a => a.id !== quizId && a.quizData?.id !== quizId));
    }
  }, [initialAssignments, onAssignmentsChange]);

  const duplicateQuiz = useCallback(async (quiz: QuizAssignment): Promise<QuizAssignment> => {
    const newId = `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const duplicated: QuizAssignment = {
      ...JSON.parse(JSON.stringify(quiz)),
      id: newId,
      title: `${quiz.title} (Copy)`,
      shareCode: `qz_${Math.random().toString(36).substring(2, 8)}`,
      createdAt: new Date().toISOString().split('T')[0]
    };

    await saveQuiz(duplicated);
    return duplicated;
  }, [saveQuiz]);

  const submitQuizResponse = useCallback(async (
    quiz: QuizAssignment,
    responses: Record<string, any>,
    studentName: string,
    studentEmail?: string,
    timeSpentSeconds?: number
  ): Promise<QuizAttempt> => {
    const attempt = gradeQuizAttempt(
      quiz,
      responses,
      studentName,
      studentEmail,
      timeSpentSeconds
    );

    setAttempts(prev => {
      const filtered = prev.filter(s => !(s.quizId === quiz.id && s.studentName.toLowerCase().trim() === studentName.toLowerCase().trim()));
      return [attempt, ...filtered];
    });

    clearDraft(quiz.id, studentName);
    syncAttemptToDatabase(attempt);
    return attempt;
  }, []);

  const updateTeacherFeedback = useCallback(async (
    attemptId: string,
    feedback: string,
    manualScoreOverride?: number,
    updatedAttempt?: Partial<QuizAttempt>
  ) => {
    setAttempts(prev => prev.map(s => {
      if (s.id !== attemptId) return s;
      if (updatedAttempt) {
        return {
          ...s,
          ...updatedAttempt
        };
      }
      const newScore = manualScoreOverride !== undefined ? manualScoreOverride : s.score;
      const newPercentage = Math.round((newScore / (s.maxPoints || 100)) * 100);
      return {
        ...s,
        score: newScore,
        scorePercentage: newPercentage,
        percentage: newPercentage,
        teacherFeedback: feedback,
        gradingStatus: 'teacher_reviewed'
      };
    }));
  }, []);

  const saveDraft = useCallback((quizId: string, studentName: string, responses: Record<string, any>, email?: string) => {
    try {
      const key = `hteim_quiz_draft_${quizId}_${studentName.replace(/\s+/g, '_')}`;
      localStorage.setItem(key, JSON.stringify({
        responses,
        email,
        savedAt: new Date().toLocaleTimeString()
      }));
    } catch {
      // ignore
    }
  }, []);

  const getDraft = useCallback((quizId: string, studentName: string) => {
    try {
      const key = `hteim_quiz_draft_${quizId}_${studentName.replace(/\s+/g, '_')}`;
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  }, []);

  const clearDraft = useCallback((quizId: string, studentName: string) => {
    try {
      const key = `hteim_quiz_draft_${quizId}_${studentName.replace(/\s+/g, '_')}`;
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, []);

  const syncOfflineQueue = useCallback(async () => {
    if (!supabase) return;
    try {
      const queueRaw = localStorage.getItem(LOCAL_STORAGE_OFFLINE_QUEUE_KEY);
      if (!queueRaw) return;
      const queue: QuizAttempt[] = JSON.parse(queueRaw);
      if (queue.length === 0) return;

      setIsSyncing(true);
      for (const item of queue) {
        await supabase.from('quiz_attempts').upsert({
          id: item.id,
          quiz_id: item.quizId,
          quiz_version_id: item.quizVersionId,
          quiz_title: item.quizTitle,
          student_name: item.studentName,
          student_email: item.studentEmail,
          score: item.score,
          max_points: item.maxPoints,
          score_percentage: item.scorePercentage,
          responses: item.responses,
          status: item.status,
          submitted_at: item.submittedAt
        });
      }
      localStorage.removeItem(LOCAL_STORAGE_OFFLINE_QUEUE_KEY);
    } catch {
      // keep in queue
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    quizzes,
    attempts,
    isLoading,
    isSyncing,
    saveQuiz,
    deleteQuiz,
    duplicateQuiz,
    submitQuizResponse,
    updateTeacherFeedback,
    saveDraft,
    getDraft,
    clearDraft,
    syncOfflineQueue
  };
}
