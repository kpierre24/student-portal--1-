import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Award, 
  BookOpen, 
  User, 
  Sparkles, 
  AlertCircle, 
  ArrowRight, 
  RotateCcw, 
  X, 
  Check,
  GraduationCap,
  Save,
  Trash2,
  RefreshCw,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Printer,
  Mail,
  HelpCircle,
  CheckSquare,
  MessageSquare,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { QuizAssignment, QuizQuestion, QuizAttempt, QuizResponse } from '../types';
import { gradeQuizAttempt } from '../data/quizTemplates';
import { useAccessibleModal } from '../lib/useAccessibleModal';
import { portalApiClient } from '../services/api/portalApiClient';

export interface QuizTakerViewProps {
  quiz: QuizAssignment;
  studentRoster?: { name: string }[];
  currentStudentName?: string;
  studentName?: string;
  previousSubmission?: QuizAttempt | null;
  onSubmitQuiz?: (attempt: QuizAttempt) => Promise<QuizAttempt | void> | QuizAttempt | void;
  onComplete?: (attempt: QuizAttempt) => void;
  onClose: () => void;
}

export const QuizTakerView: React.FC<QuizTakerViewProps> = ({
  quiz,
  studentRoster = [],
  currentStudentName,
  studentName,
  previousSubmission,
  onSubmitQuiz,
  onComplete,
  onClose
}) => {
  const dialogRef = useAccessibleModal(true, onClose);
  const loggedInStudentName = studentName || currentStudentName || '';
  const initialStudentName = loggedInStudentName || (studentRoster[0]?.name || '');
  const [selectedStudentName, setSelectedStudentName] = useState(initialStudentName);
  const [customStudentName, setCustomStudentName] = useState(loggedInStudentName);
  const [studentEmail, setStudentEmail] = useState('');
  const [isCustomName, setIsCustomName] = useState(!loggedInStudentName && studentRoster.length === 0);

  // Active student name
  const effectiveStudentName = (isCustomName ? customStudentName : selectedStudentName).trim() || 'HTEIM Student';

  // State: questionId -> value (string for radio/text, string[] for checkboxes)
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState(!!previousSubmission);
  const [submissionResult, setSubmissionResult] = useState<QuizAttempt | null>(previousSubmission || null);
  const [resultsFilter, setResultsFilter] = useState<'all' | 'missed' | 'correct'>('all');

  // Attempt tracking
  const [attemptCount, setAttemptCount] = useState(1);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [pinnedQuiz, setPinnedQuiz] = useState<QuizAssignment>(quiz);
  const [pinnedQuizVersionId, setPinnedQuizVersionId] = useState<string | null>(null);

  // Auto-save & draft restoration state
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string | null>(null);
  const [restoredFromDraft, setRestoredFromDraft] = useState<boolean>(false);
  const [showResumePrompt, setShowResumePrompt] = useState<boolean>(false);
  const [draftDetails, setDraftDetails] = useState<{
    startTimeStr: string;
    timeRemainingStr: string;
    responses: Record<string, any>;
    attemptId?: string;
    email?: string;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submissionPhase, setSubmissionPhase] = useState<'IN_PROGRESS' | 'SUBMITTING' | 'SUBMIT_FAILED' | 'RELEASED'>('IN_PROGRESS');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [secondsSinceLastSave, setSecondsSinceLastSave] = useState<number>(0);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);

  // Timer State
  const initialSeconds = quiz.timeLimitMinutes ? quiz.timeLimitMinutes * 60 : null;
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(initialSeconds);
  const [startTime] = useState<number>(Date.now());

  // Shuffled questions and options state (if configured in settings)
  const [displayedQuestions, setDisplayedQuestions] = useState<QuizQuestion[]>([]);

  useEffect(() => {
    let qList = [...pinnedQuiz.questions];
    if (pinnedQuiz.settings?.shuffleQuestions) {
      qList = qList.sort(() => Math.random() - 0.5);
    }
    if (pinnedQuiz.settings?.shuffleOptions) {
      qList = qList.map(q => {
        if (q.type === 'multiple_choice' || q.type === 'checkboxes') {
          return {
            ...q,
            options: [...q.options].sort(() => Math.random() - 0.5)
          };
        }
        return q;
      });
    }
    setDisplayedQuestions(qList);
  }, [pinnedQuiz]);

  // Load draft or previous submission
  useEffect(() => {
    if (previousSubmission) {
      setIsSubmitted(true);
      setSubmissionResult(previousSubmission);
      return;
    }

    try {
      const draftKey = `hteim_quiz_draft_${quiz.id}_${effectiveStudentName.replace(/\s+/g, '_')}`;
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.responses && Object.keys(parsed.responses).length > 0) {
          setDraftDetails({
            startTimeStr: parsed.savedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timeRemainingStr: parsed.timeRemainingStr || (secondsRemaining ? `${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, '0')}` : '08:21'),
            responses: parsed.responses || {},
            attemptId: parsed.attemptId,
            email: parsed.email
          });
          setShowResumePrompt(true);
        }
      }
    } catch {
      // ignore
    }
  }, [quiz.id, effectiveStudentName, previousSubmission]);

  // Create server-side quiz attempt before answering begins
  useEffect(() => {
    if (isSubmitted || attemptId) return;
    const shareCodeToUse = quiz.shareCode || quiz.id;
    portalApiClient.createQuizAttempt(shareCodeToUse, {
      studentName: effectiveStudentName,
      studentEmail: studentEmail
    }).then(res => {
      if (res?.attemptId) setAttemptId(res.attemptId);
      if (res?.quizSnapshot) {
        setPinnedQuiz(res.quizSnapshot);
      }
      if (res?.quizVersionId) {
        setPinnedQuizVersionId(res.quizVersionId);
      }
    }).catch(err => {
      console.warn('Notice initializing server quiz attempt:', err);
    });
  }, [quiz.id, quiz.shareCode, effectiveStudentName, isSubmitted]);

  // Server autosave + LocalStorage offline recovery cache
  useEffect(() => {
    if (isSubmitted || submissionPhase === 'SUBMITTING') return;
    setIsCloudSyncing(true);

    const timer = setTimeout(() => {
      const shareCodeToUse = quiz.shareCode || quiz.id;
      const timeSpentSeconds = Math.round((Date.now() - startTime) / 1000);

      // LocalStorage recovery cache
      try {
        const draftKey = `hteim_quiz_draft_${quiz.id}_${effectiveStudentName.replace(/\s+/g, '_')}`;
        localStorage.setItem(draftKey, JSON.stringify({
          responses,
          email: studentEmail,
          attemptId,
          savedAt: new Date().toLocaleTimeString()
        }));
      } catch {}

      // Server-side autosave
      if (attemptId) {
        portalApiClient.autosaveQuizAttemptResponses(shareCodeToUse, attemptId, {
          responses,
          timeSpentSeconds
        }).then(() => {
          setLastAutoSavedAt(new Date().toLocaleTimeString());
          setSecondsSinceLastSave(0);
        }).catch(err => {
          console.warn('Autosave notice:', err);
        }).finally(() => {
          setIsCloudSyncing(false);
        });
      } else {
        setLastAutoSavedAt(new Date().toLocaleTimeString());
        setSecondsSinceLastSave(0);
        setIsCloudSyncing(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [responses, studentEmail, isSubmitted, quiz.id, quiz.shareCode, effectiveStudentName, attemptId, submissionPhase]);

  // Tick the seconds since last save
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsSinceLastSave(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (isSubmitted || secondsRemaining === null) return;
    if (secondsRemaining <= 0) {
      handleFinalSubmit();
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsRemaining, isSubmitted]);

  // Answer change handlers
  const handleSelectRadio = (questionId: string, optionId: string) => {
    setResponses(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleToggleCheckbox = (questionId: string, optionId: string) => {
    setResponses(prev => {
      const current: string[] = Array.isArray(prev[questionId]) ? prev[questionId] : (prev[questionId] ? [prev[questionId]] : []);
      const exists = current.includes(optionId);
      const updated = exists ? current.filter(id => id !== optionId) : [...current, optionId];
      return { ...prev, [questionId]: updated };
    });
  };

  const handleTextChange = (questionId: string, text: string) => {
    setResponses(prev => ({ ...prev, [questionId]: text }));
  };

  const handleToggleFlag = (questionId: string) => {
    setFlaggedQuestions(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  // Check how many answered
  const answeredCount = displayedQuestions.filter(q => {
    const val = responses[q.id];
    if (val === undefined || val === null || val === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  }).length;

  const totalQuestions = displayedQuestions.length;
  const progressPercent = Math.round((answeredCount / (totalQuestions || 1)) * 100);

  // Validate before submit
  const handleInitiateSubmit = () => {
    const errors: string[] = [];
    displayedQuestions.forEach((q, idx) => {
      if (q.required) {
        const val = responses[q.id];
        const isAnswered = val !== undefined && val !== null && val !== '' && (!Array.isArray(val) || val.length > 0);
        if (!isAnswered) {
          errors.push(`Question #${idx + 1} is required.`);
        }
      }
    });

    if (pinnedQuiz.settings?.collectStudentEmail && !studentEmail.trim()) {
      errors.push('Please provide your student email address.');
    }

    setValidationErrors(errors);
    setShowSubmitConfirm(true);
  };

  const handleFinalSubmit = async () => {
    setShowSubmitConfirm(false);
    setSubmissionError(null);
    const timeSpentSeconds = Math.round((Date.now() - startTime) / 1000);

    // Transition to SUBMITTING state
    setSubmissionPhase('SUBMITTING');

    try {
      // 1. Calculate local preview grade
      const localAttempt = gradeQuizAttempt(
        pinnedQuiz,
        responses,
        effectiveStudentName,
        studentEmail,
        timeSpentSeconds
      );
      localAttempt.attemptNumber = attemptCount;
      localAttempt.quizTitle = pinnedQuiz.title;
      (localAttempt as any).rawResponses = responses;
      (localAttempt as any).shareCode = pinnedQuiz.shareCode || pinnedQuiz.id;
      localAttempt.quizVersionId = pinnedQuizVersionId || localAttempt.quizVersionId;
      (localAttempt as any).attemptId = attemptId;

      let finalAttempt = localAttempt;

      // 2. Authoritative Server Submission Call
      if (onSubmitQuiz) {
        const serverAttempt = await onSubmitQuiz(localAttempt);
        if (serverAttempt && typeof serverAttempt === 'object' && serverAttempt.id) {
          finalAttempt = serverAttempt;
        }
      }

      // 3. Server confirmed success -> update UI to RELEASED / Completed
      setSubmissionResult(finalAttempt);
      setSubmissionPhase('RELEASED');
      setIsSubmitted(true);

      // Clean draft from local storage
      try {
        const draftKey = `hteim_quiz_draft_${quiz.id}_${effectiveStudentName.replace(/\s+/g, '_')}`;
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }

      if (onComplete) onComplete(finalAttempt);
    } catch (err: any) {
      console.error('Quiz submission failed:', err);
      setSubmissionPhase('SUBMIT_FAILED');
      setSubmissionError(err?.message || 'Submission failed. Your answers have NOT been submitted.');
    }
  };

  const handleRetakeQuiz = () => {
    setResponses({});
    setFlaggedQuestions({});
    setIsSubmitted(false);
    setSubmissionResult(null);
    setSubmissionPhase('IN_PROGRESS');
    setAttemptCount(prev => prev + 1);
    if (initialSeconds) setSecondsRemaining(initialSeconds);
  };

  const handlePrintResults = () => {
    window.print();
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${quiz.title || 'Quiz'} Workspace`}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn modal-material-scrim"
    >
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[96vh] flex flex-col overflow-hidden modal-material-dialog">

        {/* Top Gradient Banner (Google Forms Style) */}
        <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-950 text-white p-4 sm:p-5 relative shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest bg-purple-500/30 px-2 py-0.5 rounded-full border border-purple-300/30 text-purple-100">
                  {quiz.courseCode || 'MIN-101'} • {quiz.moduleTrack || 'School of Ministry'}
                </span>
                <span className="text-[10px] font-bold bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-full border border-amber-400/30">
                  {quiz.totalPoints || 100} Total Points
                </span>
                {pinnedQuizVersionId && (
                  <span className="text-[10px] font-mono font-bold bg-emerald-400/20 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    Version: {pinnedQuizVersionId.replace(`ver_${quiz.id}_v`, 'v')}
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight truncate">
                {quiz.title}
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Live Timer if applicable */}
              {secondsRemaining !== null && !isSubmitted && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-black shadow-inner ${
                  secondsRemaining < 120 
                    ? 'bg-rose-500/90 text-white animate-pulse' 
                    : secondsRemaining < 300 
                    ? 'bg-amber-500/90 text-slate-950' 
                    : 'bg-black/30 text-purple-100 border border-purple-400/30'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTimer(secondsRemaining)}</span>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Progress bar in test mode */}
          {!isSubmitted && (
            <div className="mt-3 pt-3 border-t border-purple-500/30">
              <div className="flex items-center justify-between text-xs font-bold text-purple-200 mb-1.5">
                <span>Progress: {answeredCount} of {totalQuestions} answered ({progressPercent}%)</span>
                <span className="text-[10px] text-purple-300 flex items-center gap-1.5 font-mono">
                  <Save className={`w-3 h-3 ${isCloudSyncing ? 'text-amber-400 animate-spin' : 'text-emerald-400'}`} />
                  <span>
                    {isCloudSyncing 
                      ? "Syncing cloud draft..." 
                      : secondsSinceLastSave <= 2
                      ? "✓ Saved just now"
                      : `✓ Saved ${secondsSinceLastSave} seconds ago`
                    }
                  </span>
                </span>
              </div>
              <div className="w-full h-2 bg-purple-950/60 rounded-full overflow-hidden border border-purple-400/30">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Form Body / Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* ========================================================= */}
          {/* VIEW A: ACTIVE QUIZ TAKING INTERFACE */}
          {/* ========================================================= */}
          {!isSubmitted && (
            submissionPhase !== 'IN_PROGRESS' ? (
              submissionPhase === 'SUBMIT_FAILED' ? (
                <div className="py-8 px-4 max-w-lg mx-auto text-center space-y-6 animate-fadeIn">
                  <div className="bg-rose-950/90 border-2 border-rose-600 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
                    <div className="w-14 h-14 bg-rose-900/90 text-rose-300 rounded-2xl flex items-center justify-center mx-auto border border-rose-700 shadow-lg">
                      <AlertTriangle className="w-8 h-8 text-rose-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">Submission Failed</h3>
                      <p className="text-sm font-bold text-rose-200 mt-1">
                        Your answers have <span className="underline decoration-rose-400 font-extrabold text-white uppercase tracking-wider">NOT</span> been submitted.
                      </p>
                    </div>
                    {submissionError && (
                      <div className="bg-slate-900/90 border border-rose-800/80 rounded-xl p-3.5 text-xs text-rose-300 max-w-lg mx-auto font-mono text-left leading-relaxed">
                        {submissionError}
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      <button
                        onClick={handleFinalSubmit}
                        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Retry Submission</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 px-4 max-w-lg mx-auto text-center space-y-6 animate-fadeIn">
                  <div className="space-y-3">
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="absolute inset-0 rounded-full border-4 border-purple-100 dark:border-purple-950/50"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-purple-600 border-t-transparent animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 text-purple-600 dark:text-purple-400 animate-spin" />
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      Submitting Assessment to Server...
                    </h3>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Verifying payload integrity, executing server-side grading rules, and recording attempt. Please do not close this window.
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-6">

              {/* Resume Attempt Prompt Banner */}
              {showResumePrompt && draftDetails && (
                <div className="bg-slate-900 border-2 border-purple-500 text-white rounded-2xl p-5 shadow-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-600/30 border border-purple-500 rounded-xl text-purple-300">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">Resume your attempt?</h3>
                      <p className="text-xs text-slate-300">An ongoing quiz session was found for this assessment.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl text-xs font-mono text-slate-300 border border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Attempt started:</span>
                      <span className="font-bold text-purple-300">{draftDetails.startTimeStr}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Time remaining:</span>
                      <span className="font-bold text-amber-400">{draftDetails.timeRemainingStr}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setResponses(draftDetails.responses);
                        if (draftDetails.email) setStudentEmail(draftDetails.email);
                        if (draftDetails.attemptId) setAttemptId(draftDetails.attemptId);
                        setShowResumePrompt(false);
                        setRestoredFromDraft(true);
                      }}
                      className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resume Attempt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowResumePrompt(false);
                        setResponses({});
                        setAttemptId(null);
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 cursor-pointer"
                    >
                      Start Fresh
                    </button>
                  </div>
                </div>
              )}
              
              {/* Student Identity Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/80 pb-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Student Examination Profile
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Attempt #{attemptCount} {pinnedQuiz.settings?.maxAttempts ? `of ${pinnedQuiz.settings.maxAttempts}` : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Student Full Name <span className="text-rose-500">*</span>
                    </label>
                    {studentRoster.length > 0 && !isCustomName ? (
                      <div className="flex gap-2">
                        <select
                          value={selectedStudentName}
                          onChange={(e) => setSelectedStudentName(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold"
                        >
                          {studentRoster.map(s => (
                            <option key={s.name} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setIsCustomName(true)}
                          className="px-2.5 py-2 text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 rounded-xl hover:bg-purple-100 transition-colors"
                        >
                          Other
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={customStudentName}
                        onChange={(e) => setCustomStudentName(e.target.value)}
                        placeholder="Enter your registered student name..."
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold"
                      />
                    )}
                  </div>

                  {pinnedQuiz.settings?.collectStudentEmail && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Student Email (For Grade Dispatch) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        placeholder="pastor.student@hteim.org"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium"
                      />
                    </div>
                  )}
                </div>

                {quiz.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                    <strong>Instructions:</strong> {quiz.description}
                  </p>
                )}
              </div>

              {/* Quick Jump Navigator Bar */}
              <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 overflow-x-auto">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300 shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Jump To:</span>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {displayedQuestions.map((q, idx) => {
                    const isAnswered = responses[q.id] !== undefined && responses[q.id] !== '' && (!Array.isArray(responses[q.id]) || responses[q.id].length > 0);
                    const isFlagged = flaggedQuestions[q.id];

                    return (
                      <a
                        key={q.id}
                        href={`#q_card_${q.id}`}
                        className={`w-8 h-8 rounded-lg text-xs font-black flex items-center justify-center font-mono transition-all ${
                          isFlagged 
                            ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-500' 
                            : isAnswered 
                            ? 'bg-purple-600 text-white shadow-xs' 
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                        title={`Question ${idx + 1}: ${isAnswered ? 'Answered' : 'Unanswered'}${isFlagged ? ' (Flagged for Review)' : ''}`}
                      >
                        {idx + 1}
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {displayedQuestions.map((q, qIndex) => {
                  const qType = q.type || 'multiple_choice';
                  const isFlagged = flaggedQuestions[q.id];
                  const userVal = responses[q.id];
                  const isAnswered = userVal !== undefined && userVal !== '' && (!Array.isArray(userVal) || userVal.length > 0);

                  return (
                    <div
                      key={q.id}
                      id={`q_card_${q.id}`}
                      className={`bg-white dark:bg-slate-800/95 rounded-2xl p-5 border-2 shadow-sm transition-all scroll-mt-6 ${
                        isFlagged 
                          ? 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/20' 
                          : isAnswered 
                          ? 'border-purple-200 dark:border-purple-800/80' 
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {/* Question Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 font-black text-xs flex items-center justify-center font-mono">
                            {qIndex + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            Question {qIndex + 1} of {totalQuestions}
                          </span>
                          {q.required && (
                            <span className="text-rose-500 font-bold text-xs" title="Required question">*</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                            {q.weight ?? 10} pts
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleFlag(q.id)}
                            className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                              isFlagged 
                                ? 'bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100' 
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                            }`}
                            title="Bookmark/Flag for review"
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-500 text-amber-500' : ''}`} />
                            <span className="hidden sm:inline">{isFlagged ? 'Flagged' : 'Flag'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Question Text Prompt */}
                      <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed mb-4">
                        {q.questionText}
                      </p>

                      {/* 1. Multiple Choice Options */}
                      {qType === 'multiple_choice' && (
                        <div className="space-y-2.5">
                          {q.options.map((opt, optIdx) => {
                            const isSelected = userVal === opt.id;
                            const letter = String.fromCharCode(65 + optIdx);

                            return (
                              <label
                                key={opt.id}
                                onClick={() => handleSelectRadio(q.id, opt.id)}
                                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-600 text-purple-950 dark:text-purple-100 shadow-sm'
                                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-purple-300 dark:hover:border-purple-700'
                                }`}
                              >
                                <div className={`w-6 h-6 rounded-md text-xs font-black flex items-center justify-center font-mono shrink-0 transition-colors ${
                                  isSelected ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}>
                                  {letter}
                                </div>
                                <span className="text-xs sm:text-sm font-medium flex-1">
                                  {opt.text}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* 2. Checkboxes (Multi-Select) */}
                      {qType === 'checkboxes' && (
                        <div className="space-y-2.5">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <CheckSquare className="w-3.5 h-3.5" /> Select all options that apply:
                          </p>
                          {q.options.map((opt, optIdx) => {
                            const chosenList: string[] = Array.isArray(userVal) ? userVal : [];
                            const isSelected = chosenList.includes(opt.id);
                            const letter = String.fromCharCode(65 + optIdx);

                            return (
                              <label
                                key={opt.id}
                                onClick={() => handleToggleCheckbox(q.id, opt.id)}
                                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-600 text-indigo-950 dark:text-indigo-100 shadow-sm'
                                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-700'
                                }`}
                              >
                                <div className={`w-6 h-6 rounded-md text-xs font-black flex items-center justify-center font-mono shrink-0 transition-colors ${
                                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}>
                                  {letter}
                                </div>
                                <span className="text-xs sm:text-sm font-medium flex-1">
                                  {opt.text}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* 3. True / False */}
                      {qType === 'true_false' && (
                        <div className="grid grid-cols-2 gap-3">
                          {q.options.map(opt => {
                            const isSelected = userVal === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleSelectRadio(q.id, opt.id)}
                                className={`py-3.5 px-4 rounded-xl border-2 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-purple-600 text-white border-purple-700 shadow-md scale-[1.01]'
                                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-400'
                                }`}
                              >
                                <span>{opt.text}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* 4. Short Answer & Fill Blank */}
                      {(qType === 'short_answer' || qType === 'fill_blank') && (
                        <div>
                          <input
                            type="text"
                            value={typeof userVal === 'string' ? userVal : ''}
                            onChange={(e) => handleTextChange(q.id, e.target.value)}
                            placeholder={qType === 'fill_blank' ? 'Type the missing biblical word or phrase...' : 'Type your answer here...'}
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-purple-500 focus:border-purple-600 outline-none"
                          />
                        </div>
                      )}

                      {/* 5. Paragraph Reflection */}
                      {qType === 'paragraph' && (
                        <div>
                          <textarea
                            rows={4}
                            value={typeof userVal === 'string' ? userVal : ''}
                            onChange={(e) => handleTextChange(q.id, e.target.value)}
                            placeholder="Write your detailed theological synthesis and reflection here..."
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-600 outline-none"
                          />
                        </div>
                      )}

                      {/* Clear response option */}
                      {isAnswered && (
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              const next = { ...responses };
                              delete next[q.id];
                              setResponses(next);
                            }}
                            className="text-[11px] text-slate-400 hover:text-rose-500 font-bold flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Clear Answer</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Submit Action Bar */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                    Ready to complete this assessment?
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {answeredCount} of {totalQuestions} answered. You can review your answers prior to submission.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleInitiateSubmit}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Quiz Answers</span>
                </button>
              </div>

            </div>
          )
        )}

          {/* ========================================================= */}
          {/* VIEW B: GRADED QUIZ RESULTS & OFFICIAL ANSWER SHEET */}
          {/* ========================================================= */}
          {isSubmitted && submissionResult && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Score Banner */}
              <div className={`p-6 rounded-2xl border-2 text-white shadow-xl relative overflow-hidden ${
                submissionResult.percentage >= (pinnedQuiz.settings?.passingScorePercentage || 75)
                  ? 'bg-gradient-to-br from-emerald-700 via-teal-800 to-emerald-950 border-emerald-500'
                  : 'bg-gradient-to-br from-amber-700 via-rose-800 to-rose-950 border-rose-500'
              }`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                        {submissionResult.percentage >= 85 ? 'Honor Roll / High Distinction' : submissionResult.percentage >= 75 ? 'Satisfactory Pass' : 'At-Risk (<75%)'}
                      </span>
                      <span className="text-[10px] font-mono opacity-80">
                        Submitted: {submissionResult.submittedAt}
                      </span>
                    </div>
                    
                    {/* Official Confirmation Badge */}
                    <div className="flex items-center gap-2 text-xs font-mono bg-black/30 border border-white/20 px-3 py-1 rounded-xl w-fit text-emerald-300 font-bold my-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Submission successful</span>
                      <span className="text-white font-black ml-1">Confirmation #: {attemptId || submissionResult.id || 'ATT-0001'}</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                      {submissionResult.studentName}
                    </h2>
                    <p className="text-xs text-emerald-100 opacity-90 max-w-lg">
                      {submissionResult.percentage >= (pinnedQuiz.settings?.passingScorePercentage || 75)
                        ? 'Congratulations! You have satisfied the HTEIM curriculum academic threshold for this module.'
                        : 'Review the answer key and biblical commentary below to master this topic.'}
                    </p>
                  </div>

                  <div className="bg-white/15 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 text-center shrink-0 shadow-inner">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider block opacity-80">Total Score</span>
                    <div className="text-3xl sm:text-4xl font-black font-mono">
                      {submissionResult.score} / {submissionResult.totalPossible}
                    </div>
                    <span className="text-sm font-black font-mono block mt-0.5">
                      {submissionResult.percentage}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span className="text-slate-500 mr-1">Filter Results:</span>
                  <button
                    onClick={() => setResultsFilter('all')}
                    className={`px-3 py-1 rounded-lg ${resultsFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                  >
                    All ({displayedQuestions.length})
                  </button>
                  <button
                    onClick={() => setResultsFilter('missed')}
                    className={`px-3 py-1 rounded-lg ${resultsFilter === 'missed' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                  >
                    Missed ({submissionResult.responses.filter(r => !r.isCorrect).length})
                  </button>
                  <button
                    onClick={() => setResultsFilter('correct')}
                    className={`px-3 py-1 rounded-lg ${resultsFilter === 'correct' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                  >
                    Correct ({submissionResult.responses.filter(r => r.isCorrect).length})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintResults}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Score Slip</span>
                  </button>

                  {(pinnedQuiz.settings?.allowMultipleAttempts ?? true) && (
                    <button
                      onClick={handleRetakeQuiz}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retake Quiz</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Detailed Question By Question Review Cards */}
              <div className="space-y-5">
                {displayedQuestions
                  .filter(q => {
                    const resp = submissionResult.responses.find(r => r.questionId === q.id);
                    if (resultsFilter === 'missed') return !resp?.isCorrect;
                    if (resultsFilter === 'correct') return !!resp?.isCorrect;
                    return true;
                  })
                  .map((q, idx) => {
                    const resp = submissionResult.responses.find(r => r.questionId === q.id);
                    const isCorrect = !!resp?.isCorrect;
                    const ptsEarned = resp?.pointsEarned ?? 0;
                    const maxPts = Number(q.weight) || 10;
                    const qType = q.type || 'multiple_choice';

                    return (
                      <div
                        key={q.id}
                        className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 shadow-xs space-y-3.5 ${
                          isCorrect 
                            ? 'border-emerald-300 dark:border-emerald-800/80' 
                            : 'border-rose-300 dark:border-rose-800/80'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/80 pb-2.5">
                          <div className="flex items-center gap-2">
                            {isCorrect ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            ) : (
                              <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                            )}
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                              Question #{idx + 1}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              isCorrect 
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200' 
                                : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200'
                            }`}>
                              {isCorrect ? 'Correct' : 'Incorrect / Review Required'}
                            </span>
                          </div>

                          <span className="text-xs font-mono font-black text-slate-700 dark:text-slate-300">
                            {ptsEarned} / {maxPts} pts
                          </span>
                        </div>

                        {/* Prompt */}
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {q.questionText}
                        </p>

                        {/* Choices / Answers */}
                        {qType === 'multiple_choice' && (
                          <div className="space-y-2">
                            {q.options.map(opt => {
                              const isSelected = resp?.selectedOptionId === opt.id;
                              const isCorrectKey = (resp?.correctOptionId || q.correctOptionId) === opt.id;

                              return (
                                <div
                                  key={opt.id}
                                  className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
                                    isCorrectKey
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold'
                                      : isSelected
                                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-950 dark:text-rose-100'
                                      : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  <span>{opt.text}</span>
                                  {isCorrectKey && (
                                    <span className="text-[10px] font-black uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                                      Correct Answer
                                    </span>
                                  )}
                                  {isSelected && !isCorrectKey && (
                                    <span className="text-[10px] font-black uppercase bg-rose-600 text-white px-2 py-0.5 rounded-md">
                                      Your Choice
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {qType === 'checkboxes' && (
                          <div className="space-y-2">
                            {q.options.map(opt => {
                              const isSelected = (resp?.selectedOptionIds || []).includes(opt.id);
                              const isCorrectKey = (resp?.correctOptionIds || q.correctOptionIds || []).includes(opt.id);

                              return (
                                <div
                                  key={opt.id}
                                  className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
                                    isCorrectKey
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold'
                                      : isSelected
                                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-950 dark:text-rose-100'
                                      : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  <span>{opt.text}</span>
                                  {isCorrectKey && (
                                    <span className="text-[10px] font-black uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                                      Required Correct Option
                                    </span>
                                  )}
                                  {isSelected && !isCorrectKey && (
                                    <span className="text-[10px] font-black uppercase bg-rose-600 text-white px-2 py-0.5 rounded-md">
                                      Incorrectly Selected
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {(qType === 'short_answer' || qType === 'fill_blank') && (
                          <div className="space-y-2 text-xs">
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                              <span className="font-bold text-slate-500 block mb-1">Your Written Answer:</span>
                              <p className={`font-mono font-bold ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {resp?.textAnswer || '(Blank / No answer provided)'}
                              </p>
                            </div>
                            {!isCorrect && (
                              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                <span className="font-bold text-emerald-700 dark:text-emerald-300 block mb-1">Acceptable Answer Key:</span>
                                <p className="font-mono text-emerald-900 dark:text-emerald-100 font-semibold">
                                  {(resp?.acceptableAnswers || q.acceptableAnswers || []).join(' OR ')}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {qType === 'paragraph' && (
                          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                            <span className="font-bold text-slate-500 block mb-1">Your Essay Response:</span>
                            <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans">
                              {resp?.textAnswer || '(No reflection written)'}
                            </p>
                          </div>
                        )}

                        {/* Google Forms Biblical Feedback Card */}
                        {(isCorrect && q.feedbackCorrect) && (
                          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-bold">Biblical Commendation:</strong>
                              <p className="italic">{q.feedbackCorrect}</p>
                            </div>
                          </div>
                        )}

                        {(!isCorrect && q.feedbackIncorrect) && (
                          <div className="p-3 bg-rose-50/70 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800/60 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-bold">Instructor Study Advice:</strong>
                              <p className="italic">{q.feedbackIncorrect}</p>
                            </div>
                          </div>
                        )}

                        {(resp?.explanation || q.explanation) && (
                          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
                            <strong className="text-purple-700 dark:text-purple-300 block mb-0.5">Theological Context:</strong>
                            <p>{resp?.explanation || q.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shrink-0 modal-material-footer">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {isSubmitted ? 'Close & Return' : 'Exit Quiz'}
          </button>

          {!isSubmitted ? (
            <button
              type="button"
              onClick={handleInitiateSubmit}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
            >
              Submit Quiz ({answeredCount}/{totalQuestions})
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
            >
              Completed ({submissionResult?.percentage}%)
            </button>
          )}
        </div>

      </div>

      {/* Confirmation Modal prior to Submit */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-purple-600">
              <Award className="w-6 h-6" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Confirm Quiz Submission
              </h3>
            </div>

            {validationErrors.length > 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 rounded-xl space-y-1">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Unanswered Required Items:</span>
                </p>
                <ul className="list-disc list-inside text-[11px] text-amber-800 dark:text-amber-300">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                You have answered <strong>{answeredCount} of {totalQuestions}</strong> questions. Are you ready to submit your responses for official grading?
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200"
              >
                Review Answers
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="px-5 py-2 text-xs font-black text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md cursor-pointer"
              >
                Yes, Submit Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
