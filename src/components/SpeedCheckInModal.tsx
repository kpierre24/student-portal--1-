import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  X,
  Zap,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trophy,
  AlertTriangle,
  UserCheck,
  Calendar,
  Layers,
  ChevronDown
} from 'lucide-react';
import { StudentSummary, ClassDay } from '../types';
import { useAccessibleModal } from '../lib/useAccessibleModal';
import { announceToScreenReader } from '../lib/a11yAnnouncer';

export interface SpeedCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentSummary[];
  classDays: ClassDay[];
  activeDayId: string;
  onChangeActiveDayId?: (dayId: string) => void;
  excusedAbsences?: Record<string, Record<string, boolean>>;
  studentPhotos?: Record<string, string>;
  studentNotes?: Record<string, string>;
  onToggleAttendance: (
    studentName: string,
    classDayId: string,
    status: 'present' | 'absent' | 'excused' | 'late' | 'unmarked'
  ) => void;
  atRiskThreshold?: number;
  satisfactoryThreshold?: number;
}

interface ActionHistoryItem {
  studentName: string;
  studentIndex: number;
  previousStatus: 'present' | 'absent' | 'late' | 'excused' | 'unmarked';
  newStatus: 'present' | 'late' | 'absent';
  timestamp: number;
}

interface ToastNotice {
  id: string;
  studentName: string;
  status: 'present' | 'late' | 'absent';
  previousStatus: 'present' | 'absent' | 'late' | 'excused' | 'unmarked';
  studentIndex: number;
}

export const SpeedCheckInModal: React.FC<SpeedCheckInModalProps> = ({
  isOpen,
  onClose,
  students = [],
  classDays = [],
  activeDayId,
  onChangeActiveDayId,
  excusedAbsences = {},
  studentPhotos = {},
  studentNotes = {},
  onToggleAttendance,
  atRiskThreshold = 75,
  satisfactoryThreshold = 75,
}) => {
  const dialogRef = useAccessibleModal(isOpen, onClose);

  // Selected session (fallback to first available or activeDayId)
  const currentSessionId = activeDayId || (classDays.length > 0 ? classDays[classDays.length - 1].id : '');
  const activeClassDay = classDays.find((d) => d.id === currentSessionId) || classDays[classDays.length - 1];

  // Filter mode: 'all' or 'unmarked'
  const [filterUnmarkedOnly, setFilterUnmarkedOnly] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Undo and History tracking
  const [history, setHistory] = useState<ActionHistoryItem[]>([]);
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Swipe Drag Feedback
  const [dragX, setDragX] = useState<number>(0);
  const [dragY, setDragY] = useState<number>(0);

  // Helper to determine status for current student on the target session
  const getStudentStatus = useCallback((student: StudentSummary, dayId: string): 'present' | 'late' | 'absent' | 'excused' | 'unmarked' => {
    if (!student || !dayId) return 'unmarked';
    const dayRecord = student.attendanceByDay?.[dayId];
    const studentKey = (student.name || '').toLowerCase().trim();
    const isExcused = !!excusedAbsences[studentKey]?.[dayId];

    if (isExcused) return 'excused';
    if (!dayRecord) return 'unmarked';
    
    // Check if recorded as late via score/notes or timestamp metadata
    if (dayRecord.score === 'late' || dayRecord.score === 'LATE') return 'late';
    if (dayRecord.present) return 'present';
    return 'absent';
  }, [excusedAbsences]);

  // Filtered student list based on filterUnmarkedOnly
  const studentList = useMemo(() => {
    if (!filterUnmarkedOnly) return students;
    return students.filter((s) => {
      const status = getStudentStatus(s, currentSessionId);
      return status === 'unmarked';
    });
  }, [students, filterUnmarkedOnly, currentSessionId, getStudentStatus]);

  // Summary Metrics for the Active Session
  const sessionStats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let excused = 0;
    let unmarked = 0;

    students.forEach((s) => {
      const status = getStudentStatus(s, currentSessionId);
      if (status === 'present') present++;
      else if (status === 'late') late++;
      else if (status === 'absent') absent++;
      else if (status === 'excused') excused++;
      else unmarked++;
    });

    const total = students.length;
    const marked = total - unmarked;
    const percentage = total > 0 ? Math.round((marked / total) * 100) : 0;

    return { total, marked, unmarked, present, late, absent, excused, percentage };
  }, [students, currentSessionId, getStudentStatus]);

  // Keep currentIndex bounded
  useEffect(() => {
    if (currentIndex > studentList.length && studentList.length > 0) {
      setCurrentIndex(studentList.length);
    }
  }, [studentList.length, currentIndex]);

  // Current active student
  const currentStudent = studentList[currentIndex] || null;
  const nextStudent = studentList[currentIndex + 1] || null;

  // Clear toast after 6 seconds
  const showToast = useCallback((notice: ToastNotice) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(notice);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 6000);
  }, []);

  // Record Attendance and auto-advance
  const handleMark = useCallback((status: 'present' | 'late' | 'absent') => {
    if (!currentStudent || !currentSessionId) return;

    const prevStatus = getStudentStatus(currentStudent, currentSessionId);

    // Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }

    // Call update handler
    onToggleAttendance(currentStudent.name, currentSessionId, status);
    announceToScreenReader(`${currentStudent.name} marked ${status}`);

    // Add to history stack
    const historyItem: ActionHistoryItem = {
      studentName: currentStudent.name,
      studentIndex: currentIndex,
      previousStatus: prevStatus,
      newStatus: status,
      timestamp: Date.now(),
    };
    setHistory((prev) => [...prev, historyItem]);

    // Show instant undo toast
    showToast({
      id: `toast-${Date.now()}`,
      studentName: currentStudent.name,
      status,
      previousStatus: prevStatus,
      studentIndex: currentIndex,
    });

    // Auto-advance
    setCurrentIndex((prev) => prev + 1);
  }, [currentStudent, currentSessionId, getStudentStatus, onToggleAttendance, currentIndex, studentList.length, showToast]);

  // Instant Undo Action
  const handleUndo = useCallback(() => {
    if (!toast && history.length === 0) return;

    const lastAction = toast || history[history.length - 1];
    if (!lastAction) return;

    // Roll back attendance status to previousStatus
    onToggleAttendance(
      lastAction.studentName,
      currentSessionId,
      lastAction.previousStatus
    );
    announceToScreenReader(`Undid attendance status for ${lastAction.studentName}`);

    // Pop history
    setHistory((prev) => prev.slice(0, -1));

    // Jump back to that student
    const targetIdx = studentList.findIndex((s) => s.name === lastAction.studentName);
    if (targetIdx >= 0) {
      setCurrentIndex(targetIdx);
    } else if (lastAction.studentIndex !== undefined) {
      setCurrentIndex(Math.max(0, Math.min(studentList.length - 1, lastAction.studentIndex)));
    }

    // Dismiss toast
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(null);

    // Haptic confirmation
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([20, 40, 20]);
    }
  }, [toast, history, onToggleAttendance, currentSessionId, studentList]);

  // Keyboard navigation & quick shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input/select
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toLowerCase();

      if (key === 'p' || key === '3') {
        e.preventDefault();
        handleMark('present');
      } else if (key === 'l' || key === '2') {
        e.preventDefault();
        handleMark('late');
      } else if (key === 'a' || key === '1') {
        e.preventDefault();
        handleMark('absent');
      } else if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (key === 'u') {
        e.preventDefault();
        handleUndo();
      } else if (key === 'arrowright' || key === ' ') {
        e.preventDefault();
        if (currentIndex < studentList.length) {
          setCurrentIndex((prev) => Math.min(studentList.length, prev + 1));
        }
      } else if (key === 'arrowleft') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (key === 'escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleMark, handleUndo, currentIndex, studentList.length, onClose]);

  if (!isOpen) return null;

  const isCompleted = currentIndex >= studentList.length;

  return (
    <div
      ref={dialogRef}
      id="speed-check-in-modal"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="speed-checkin-title"
    >
      {/* Container Card */}
      <div className="relative flex flex-col w-full max-w-xl h-full max-h-[850px] bg-[var(--color-surface-elevated)] dark:bg-slate-900 border border-[var(--color-border)] dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] dark:border-slate-800 bg-[var(--color-surface)]/60 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Zap className="h-5 w-5 fill-current animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="speed-checkin-title" className="text-sm font-extrabold text-[var(--color-text)] dark:text-slate-100 font-sans tracking-tight">
                  Speed Check-In
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                  Live Roll Call
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] dark:text-slate-400">
                Single-tap or swipe cards to take roll
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Session Selector */}
            {classDays.length > 1 && onChangeActiveDayId && (
              <div className="relative">
                <select
                  value={currentSessionId}
                  onChange={(e) => onChangeActiveDayId(e.target.value)}
                  className="appearance-none pr-7 pl-2.5 py-1 text-xs font-bold rounded-xl border border-[var(--color-border)] dark:border-slate-700 bg-[var(--color-surface-elevated)] dark:bg-slate-800 text-[var(--color-text)] dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                >
                  {classDays.map((cd) => (
                    <option key={cd.id} value={cd.id}>
                      {cd.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close speed check-in"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Progress & Quick Stats Ribbon */}
        <div className="px-5 py-3 border-b border-[var(--color-border)]/60 dark:border-slate-800 bg-[var(--color-surface)] dark:bg-slate-900/50">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-[var(--color-text)] dark:text-slate-200">
              {sessionStats.marked} of {sessionStats.total} Students Marked
            </span>
            <span className="text-[var(--color-primary)] dark:text-sky-400 font-extrabold">
              {sessionStats.percentage}% Complete
            </span>
          </div>

          {/* Animated Progress Bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <motion.div
              className="h-full rounded-full bg-[var(--color-primary)]"
              initial={{ width: 0 }}
              animate={{ width: `${sessionStats.percentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Inline counts pill bar */}
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold text-[var(--color-text-muted)] dark:text-slate-400 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {sessionStats.present} Present
              </span>
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                {sessionStats.late} Late
              </span>
              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                {sessionStats.absent} Absent
              </span>
            </div>

            {/* Filter Unmarked toggle */}
            <button
              type="button"
              onClick={() => {
                setFilterUnmarkedOnly((prev) => !prev);
                setCurrentIndex(0);
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                filterUnmarkedOnly
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="h-3 w-3" />
              {filterUnmarkedOnly ? 'Unmarked Only' : 'Show All'}
            </button>
          </div>
        </div>

        {/* Center Stage: Card Stack or Completion View */}
        <div className="flex-1 relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <AnimatePresence>
            {isCompleted ? (
              /* All Students Checked Completion State */
              <motion.div
                key="completion-state"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full text-center space-y-5 max-w-md py-6"
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 shadow-inner">
                  <UserCheck className="h-10 w-10 animate-bounce" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-2xl font-black text-[var(--color-text)] dark:text-slate-100 font-sans tracking-tight">
                    Roll Call Completed! 🎉
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] dark:text-slate-400">
                    All {sessionStats.total} students have been checked for{' '}
                    <span className="font-bold text-[var(--color-text)] dark:text-slate-200">
                      {activeClassDay?.name || 'this session'}
                    </span>.
                  </p>
                </div>

                {/* Final Breakdown Card */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl border border-[var(--color-border)] dark:border-slate-800 bg-[var(--color-surface)] dark:bg-slate-800/40 text-center">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Present</span>
                    <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{sessionStats.present}</p>
                  </div>
                  <div className="space-y-0.5 border-x border-[var(--color-border)] dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Late</span>
                    <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{sessionStats.late}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Absent</span>
                    <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{sessionStats.absent}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    id="speed-checkin-btn-review"
                    onClick={() => setCurrentIndex(0)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-text)] hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 transition"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Review from Start
                  </button>
                  <button
                    id="speed-checkin-btn-done"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[var(--color-primary)] text-xs font-bold text-white hover:bg-[var(--color-primary-dark)] transition shadow-sm"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Done
                  </button>
                </div>
              </motion.div>
            ) : currentStudent ? (
              /* Active Student Card Deck */
              <div className="relative w-full max-w-sm h-full flex flex-col justify-center items-center">
                {/* Background Next Card (Peek Preview in Card Stack) */}
                {nextStudent && (
                  <div
                    className="absolute top-4 w-full h-[360px] sm:h-[390px] rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 shadow-xs pointer-events-none transform scale-95 opacity-60 transition-transform"
                    aria-hidden="true"
                  >
                    <div className="p-6 text-center opacity-40">
                      <p className="text-xs font-bold text-slate-500">Up Next</p>
                      <p className="text-sm font-black text-slate-700 dark:text-slate-300 truncate">{nextStudent.name}</p>
                    </div>
                  </div>
                )}

                {/* Foreground Active Swipe Card */}
                <motion.div
                  key={`card-${currentStudent.name}-${currentIndex}`}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.7}
                  onDrag={(_, info) => {
                    setDragX(info.offset.x);
                    setDragY(info.offset.y);
                  }}
                  onDragEnd={(_, info) => {
                    const offset = info.offset.x;
                    if (offset > 80) {
                      // Swiped Right -> Present
                      handleMark('present');
                    } else if (offset < -80) {
                      // Swiped Left -> Absent
                      handleMark('absent');
                    }
                    setDragX(0);
                    setDragY(0);
                  }}
                  initial={{ opacity: 0, y: 15, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                  className="relative z-10 w-full h-[360px] sm:h-[390px] rounded-3xl border-2 border-[var(--color-border)] dark:border-slate-700 bg-[var(--color-surface-elevated)] dark:bg-slate-800 p-6 shadow-xl flex flex-col justify-between select-none cursor-grab active:cursor-grabbing"
                  style={{
                    boxShadow:
                      dragX > 40
                        ? '0 10px 25px -5px rgba(1, 136, 60, 0.3)'
                        : dragX < -40
                        ? '0 10px 25px -5px rgba(186, 26, 26, 0.3)'
                        : '0 10px 20px -5px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  {/* Swipe Overlay Badge */}
                  {dragX > 40 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="pointer-events-none absolute top-4 right-4 bg-emerald-600 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 z-20"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      PRESENT
                    </motion.div>
                  )}
                  {dragX < -40 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="pointer-events-none absolute top-4 left-4 bg-rose-600 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 z-20"
                    >
                      <XCircle className="h-4 w-4" />
                      ABSENT
                    </motion.div>
                  )}

                  {/* Top student counter & current status */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-text-muted)] dark:text-slate-400">
                        Student {currentIndex + 1} of {studentList.length}
                      </span>

                      {/* Current marked status badge */}
                      {(() => {
                        const curStatus = getStudentStatus(currentStudent, currentSessionId);
                        if (curStatus === 'present') {
                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" /> Marked Present
                            </span>
                          );
                        }
                        if (curStatus === 'late') {
                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              <Clock className="h-3 w-3" /> Marked Late
                            </span>
                          );
                        }
                        if (curStatus === 'absent') {
                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              <XCircle className="h-3 w-3" /> Marked Absent
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            Unmarked
                          </span>
                        );
                      })()}
                    </div>

                    {/* Student Photo and Core Info */}
                    <div className="mt-5 flex flex-col items-center text-center space-y-3">
                      {/* Avatar */}
                      <div className="relative">
                        {studentPhotos[currentStudent.name.toLowerCase().trim()] || currentStudent.photoUrl ? (
                          <img
                            src={studentPhotos[currentStudent.name.toLowerCase().trim()] || currentStudent.photoUrl}
                            alt={currentStudent.name}
                            className="h-24 w-24 rounded-full object-cover border-4 border-[var(--color-primary)]/20 shadow-md"
                          />
                        ) : (
                          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] dark:text-sky-400 font-extrabold text-3xl border-4 border-[var(--color-primary)]/20 shadow-md">
                            {currentStudent.name.charAt(0)}
                          </div>
                        )}

                        {/* Overall Attendance Ring Pill */}
                        <div
                          className={`absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-full text-[10px] font-black shadow-xs border border-white dark:border-slate-800 ${
                            currentStudent.rate >= 85
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : currentStudent.rate >= satisfactoryThreshold
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {currentStudent.rate}%
                        </div>
                      </div>

                      {/* Name & Academic Level */}
                      <div>
                        <h4 className="text-xl font-extrabold text-[var(--color-text)] dark:text-slate-100 font-sans tracking-tight">
                          {currentStudent.name}
                        </h4>
                        <p className="text-xs font-semibold text-[var(--color-text-muted)] dark:text-slate-400 mt-0.5">
                          {currentStudent.cohortId || 'Class of 2026'} • Level {currentStudent.levelId ? currentStudent.levelId.replace('level_', '') : '1'}
                        </p>
                      </div>

                      {/* At Risk Alert Callout if applicable */}
                      {currentStudent.rate < atRiskThreshold && (
                        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-xl">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>At-Risk Attendance Warning (&lt;75%)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Swipe hint */}
                  <div className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    ← Swipe Left: Absent • Swipe Right: Present →
                  </div>
                </motion.div>
              </div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Action Controls & Navigation Footer */}
        {!isCompleted && currentStudent && (
          <div className="px-5 py-4 border-t border-[var(--color-border)] dark:border-slate-800 bg-[var(--color-surface)] dark:bg-slate-900/90 space-y-3">
            {/* Primary Tap Action Buttons (Thumb-friendly 52px height) */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
              {/* ABSENT BUTTON */}
              <button
                id="speed-checkin-btn-absent"
                type="button"
                onClick={() => handleMark('absent')}
                className="flex flex-col items-center justify-center gap-0.5 h-14 sm:h-16 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 border-2 border-rose-200 dark:border-rose-900/60 font-extrabold transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <XCircle className="h-4 w-4" />
                  <span>Absent</span>
                </div>
                <span className="text-[10px] text-rose-500 font-mono font-normal">[Key: A / 1]</span>
              </button>

              {/* LATE BUTTON */}
              <button
                id="speed-checkin-btn-late"
                type="button"
                onClick={() => handleMark('late')}
                className="flex flex-col items-center justify-center gap-0.5 h-14 sm:h-16 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 dark:text-amber-300 border-2 border-amber-200 dark:border-amber-900/60 font-extrabold transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Late</span>
                </div>
                <span className="text-[10px] text-amber-600 font-mono font-normal">[Key: L / 2]</span>
              </button>

              {/* PRESENT BUTTON */}
              <button
                id="speed-checkin-btn-present"
                type="button"
                onClick={() => handleMark('present')}
                className="flex flex-col items-center justify-center gap-0.5 h-14 sm:h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-700 font-extrabold transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Present</span>
                </div>
                <span className="text-[10px] text-emerald-200 font-mono font-normal">[Key: P / 3]</span>
              </button>
            </div>

            {/* Sub-bar: Prev, Skip, Undo, Keyboard reminder */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--color-border)] dark:border-slate-800 text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              {/* Undo action button */}
              <button
                type="button"
                disabled={history.length === 0}
                onClick={handleUndo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Undo</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(studentList.length, prev + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--color-border)] dark:border-slate-800 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition"
              >
                <span>Skip</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Instant Undo Bottom Toast Banner */}
        <AnimatePresence>
          {toast && (
            <motion.div
              role="alert"
              id="speed-checkin-toast"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 z-30 flex items-center justify-between px-4 py-3 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {toast.status === 'present' && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                {toast.status === 'late' && <Clock className="h-4 w-4 text-amber-400 shrink-0" />}
                {toast.status === 'absent' && <XCircle className="h-4 w-4 text-rose-400 shrink-0" />}
                <p className="text-xs font-semibold truncate">
                  Marked <strong className="text-white">{toast.studentName}</strong> as{' '}
                  <span className="uppercase font-bold text-amber-300">{toast.status}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  id="speed-checkin-toast-undo"
                  type="button"
                  onClick={handleUndo}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg transition active:scale-95 flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Undo
                </button>
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  className="text-slate-400 hover:text-white p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
