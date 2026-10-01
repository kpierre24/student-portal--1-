import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  PenSquare, 
  SlidersHorizontal, 
  Check, 
  RotateCcw,
  Lock,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { StudentSummary, ClassDay } from '../types';
import { getAttendanceLockInfo } from '../lib/attendanceLock';

interface SwipeableAttendanceCardProps {
  student: StudentSummary;
  effectiveClassDays: ClassDay[];
  activeDayId: string;
  studentPhotos: Record<string, string>;
  studentNotes: Record<string, string>;
  excusedAbsences: Record<string, Record<string, boolean>>;
  isSelected: boolean;
  satisfactoryThreshold: number;
  atRiskThreshold: number;
  studentBadges: any[];
  onToggleAttendance: (studentName: string, dayId: string, status: 'present' | 'absent' | 'excused' | 'unmarked') => void;
  onSelectStudent: (s: StudentSummary) => void;
  onToggleSelectStudent: (name: string) => void;
  appRole?: string;
}

export const SwipeableAttendanceCard: React.FC<SwipeableAttendanceCardProps> = ({
  student,
  effectiveClassDays,
  activeDayId,
  studentPhotos,
  studentNotes,
  excusedAbsences,
  isSelected,
  satisfactoryThreshold,
  atRiskThreshold,
  studentBadges,
  onToggleAttendance,
  onSelectStudent,
  onToggleSelectStudent,
  appRole
}) => {
  const studentKey = (student?.name || '').toLowerCase().trim();
  const cardPhoto = studentPhotos[studentKey] || student.photoUrl;
  const note = studentNotes[studentKey] || student.note;
  const isExcusedMap = excusedAbsences[studentKey] || {};

  // Active day session info for card swipe
  const targetDay = effectiveClassDays.find(d => d.id === activeDayId) || effectiveClassDays[effectiveClassDays.length - 1];
  const targetDayId = targetDay ? targetDay.id : '';
  const currentAttendance = targetDayId ? student.attendanceByDay[targetDayId] : undefined;
  const isPresent = currentAttendance?.present;
  const isExcused = !isPresent && !!isExcusedMap[targetDayId];
  const targetLockInfo = getAttendanceLockInfo(currentAttendance, targetDay);
  const isTargetLocked = targetLockInfo.isLocked;

  // Toggle historical session visibility
  const [showHistory, setShowHistory] = useState(appRole === 'student');

  // Touch Swipe State
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeActionText, setSwipeActionText] = useState<string | null>(null);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isHorizontalSwipe = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (appRole === 'student') return;
    if (isTargetLocked) {
      setSwipeActionText('🔒 Locked (>24h since capture)');
      setTimeout(() => setSwipeActionText(null), 1800);
      return;
    }
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isHorizontalSwipe.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || appRole === 'student' || isTargetLocked) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // If user is scrolling vertically, cancel horizontal swipe drag
    if (!isHorizontalSwipe.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
        setIsDragging(false);
        setDragOffset(0);
        return;
      }
      if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) {
        isHorizontalSwipe.current = true;
      }
    }

    if (isHorizontalSwipe.current) {
      // Limit drag displacement (-120px to +120px)
      const clampedX = Math.max(-120, Math.min(120, deltaX));
      setDragOffset(clampedX);

      if (clampedX > 40) {
        setSwipeActionText('Release to Mark Present ✓');
      } else if (clampedX < -40) {
        setSwipeActionText(isPresent ? 'Release to Mark Excused ⚠' : isExcused ? 'Release to Mark Absent ✗' : 'Release to Mark Excused ⚠');
      } else {
        setSwipeActionText(null);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || appRole === 'student' || isTargetLocked) return;
    setIsDragging(false);

    if (isHorizontalSwipe.current && targetDayId) {
      if (dragOffset > 50) {
        // Swipe Right -> Mark Present
        onToggleAttendance(student.name, targetDayId, 'present');
        if (navigator.vibrate) navigator.vibrate(35);
      } else if (dragOffset < -50) {
        // Swipe Left -> Toggle Excused / Absent
        const nextStatus = isPresent ? 'excused' : isExcused ? 'absent' : 'excused';
        onToggleAttendance(student.name, targetDayId, nextStatus);
        if (navigator.vibrate) navigator.vibrate(25);
      }
    }

    setDragOffset(0);
    setSwipeActionText(null);
    isHorizontalSwipe.current = false;
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 bg-slate-900 shadow-xs hover:shadow-lg transition-all duration-200 hover:scale-[1.012] hover:-translate-y-0.5 group">
      {/* Behind Card Background Action Feedback */}
      <div 
        className={`absolute inset-0 flex items-center justify-between px-3 sm:px-5 font-black text-xs text-white transition-colors ${
          dragOffset > 0 
            ? 'bg-emerald-600' 
            : dragOffset < 0 
            ? (isPresent ? 'bg-amber-600' : isExcused ? 'bg-rose-600' : 'bg-amber-600')
            : 'bg-slate-800'
        }`}
      >
        <div className={`flex items-center gap-1.5 sm:gap-2 ${dragOffset > 20 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'} transition-all`}>
          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-100 animate-pulse shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-black">MARK PRESENT</span>
            <span className="text-[8px] sm:text-[9px] opacity-80 font-normal">Swipe Right Complete</span>
          </div>
        </div>

        <div className={`flex items-center gap-1.5 sm:gap-2 ${dragOffset < -20 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'} transition-all`}>
          <div className="flex flex-col text-right">
            <span className="text-xs sm:text-sm font-black">{isPresent ? 'MARK EXCUSED' : isExcused ? 'MARK ABSENT' : 'MARK EXCUSED'}</span>
            <span className="text-[8px] sm:text-[9px] opacity-80 font-normal">Swipe Left Complete</span>
          </div>
          {isPresent ? (
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-100 animate-pulse shrink-0" />
          ) : isExcused ? (
            <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-100 animate-pulse shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-100 animate-pulse shrink-0" />
          )}
        </div>
      </div>

      {/* Main Foreground Card Content */}
      <motion.div
        animate={{ x: dragOffset }}
        transition={isDragging ? { type: "tween", duration: 0 } : { type: "spring", stiffness: 450, damping: 28 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="bg-white dark:bg-slate-900 p-2.5 sm:p-3 relative z-10 space-y-2 sm:space-y-2.5 select-none"
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelectStudent(student.name);
              }}
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 accent-indigo-600 rounded cursor-pointer shrink-0"
            />
            
            {cardPhoto ? (
              <img 
                src={cardPhoto} 
                alt={student.name} 
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-200 shrink-0" 
              />
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 text-indigo-700 dark:text-indigo-300 font-black text-[11px] sm:text-xs flex items-center justify-center shrink-0">
                {student.name.charAt(0)}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h4 
                  onClick={() => onSelectStudent(student)}
                  className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white truncate hover:text-indigo-600 cursor-pointer"
                >
                  {student.name}
                </h4>
                {note && (
                  <span className="text-indigo-500 bg-indigo-50 dark:bg-indigo-950 p-0.5 rounded text-[9px] shrink-0" title={note}>
                    <PenSquare className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
              <p className="text-[8px] sm:text-[9px] text-slate-400 font-mono">
                {student.attended}/{effectiveClassDays.length} sessions attended
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {studentBadges.map((b, bIdx) => (
              <span key={`swipe-badge-${b.id || b.label || bIdx}-${bIdx}`} className={`inline-flex items-center p-0.5 rounded text-[8px] sm:text-[9px] ${b.bg || ''}`} title={b.label}>
                {b.icon}
              </span>
            ))}

            <span className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-mono font-extrabold ${
              student.rate >= satisfactoryThreshold 
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800' 
                : student.rate >= atRiskThreshold 
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800' 
                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
            }`}>
              {Math.round(student.rate)}%
            </span>
          </div>
        </div>

        {/* Quick Swipe & 1-Tap Quick Status Buttons for Active Session */}
        {appRole !== 'student' && targetDayId && (
          <div className={`flex items-center justify-between gap-1.5 p-1.5 rounded-xl border ${
            isTargetLocked
              ? 'bg-slate-100/90 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700'
              : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/80'
          }`}>
            <div className="flex items-center gap-1 min-w-0">
              {isTargetLocked ? (
                <span title="Record Locked (>24h since capture)" className="inline-flex">
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                </span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
              )}
              <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 truncate max-w-[90px] sm:max-w-[120px]" title={targetDay?.name}>
                {targetDay?.name || 'Active Session'}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAttendance(student.name, targetDayId, 'present');
                  if (navigator.vibrate) navigator.vibrate(25);
                }}
                className={`px-2.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-all min-h-[44px] cursor-pointer active:opacity-80 touch-min-44 ${
                  isPresent 
                    ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-400' 
                    : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                } ${isTargetLocked ? 'opacity-85' : ''}`}
                title={isTargetLocked ? '🔒 Record Locked (>24h since capture)' : 'Mark Present'}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Present</span>
                {isTargetLocked && <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAttendance(student.name, targetDayId, 'excused');
                  if (navigator.vibrate) navigator.vibrate(25);
                }}
                className={`px-2.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-all min-h-[44px] cursor-pointer active:opacity-80 touch-min-44 ${
                  isExcused 
                    ? 'bg-amber-500 text-slate-950 shadow-xs ring-1 ring-amber-300' 
                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                } ${isTargetLocked ? 'opacity-85' : ''}`}
                title={isTargetLocked ? '🔒 Record Locked (>24h since capture)' : 'Mark Excused'}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Excused</span>
                {isTargetLocked && <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAttendance(student.name, targetDayId, 'absent');
                  if (navigator.vibrate) navigator.vibrate(25);
                }}
                className={`px-2.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-all min-h-[44px] cursor-pointer active:opacity-80 touch-min-44 ${
                  !isPresent && !isExcused && currentAttendance?.present === false
                    ? 'bg-rose-600 text-white shadow-xs ring-1 ring-rose-400' 
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80 hover:bg-rose-100 dark:hover:bg-rose-900/40'
                } ${isTargetLocked ? 'opacity-85' : ''}`}
                title={isTargetLocked ? '🔒 Record Locked (>24h since capture)' : 'Mark Absent'}
              >
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Absent</span>
                {isTargetLocked && <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-0.5" />}
              </button>
            </div>
          </div>
        )}

        {/* Swipe Feedback Banner when active */}
        {swipeActionText && (
          <div className={`p-1.5 rounded-lg text-center text-[11px] sm:text-xs font-black animate-pulse ${
            dragOffset > 0 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-slate-950'
          }`}>
            {swipeActionText}
          </div>
        )}

        {/* Horizontal Scrollable Class Days Track (Collapsible for Admins/Teachers) */}
        {showHistory && (
          <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 animate-fade-slide-up">
            <div className="flex items-center justify-between text-[8px] sm:text-[9px] font-bold text-slate-400 px-0.5">
              <span>Sessions ({effectiveClassDays.length})</span>
              <span className="font-mono text-indigo-500 flex items-center gap-0.5">
                <span>Tap to toggle</span>
              </span>
            </div>

            <div 
              className="overflow-x-auto custom-scrollbar flex gap-1.5 sm:gap-2 pb-1 pt-0.5"
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {effectiveClassDays.map((day, dIdx) => {
                const attendance = student.attendanceByDay[day.id];
                const dayPresent = attendance?.present;
                const dayExcused = !dayPresent && !!isExcusedMap[day.id];
                const isCurrentSession = day.id === targetDayId;
                const dayLockInfo = getAttendanceLockInfo(attendance, day);
                const isDayLocked = dayLockInfo.isLocked;

                return (
                  <div 
                    key={`card-day-${student.name || 'std'}-${day.id || dIdx}-${dIdx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (appRole === 'student') return;
                      onToggleAttendance(
                        student.name, 
                        day.id, 
                        dayPresent ? 'excused' : dayExcused ? 'absent' : 'present'
                      );
                    }}
                    className={`shrink-0 min-w-[95px] sm:min-w-[108px] min-h-[48px] p-2 rounded-xl border flex flex-col items-center justify-between gap-1 sm:gap-1.5 transition-all text-center select-none touch-min-44 ${
                      isCurrentSession ? 'ring-2 ring-indigo-500/80 shadow-xs' : ''
                    } ${
                      dayPresent 
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50' 
                        : dayExcused 
                        ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50' 
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60'
                    } ${isDayLocked ? 'opacity-90' : ''} ${appRole !== 'student' ? 'cursor-pointer active:opacity-80' : ''}`}
                    title={
                      isDayLocked
                        ? `🔒 Record Locked: Captured >24h ago`
                        : `⏱ Editable (${dayLockInfo.hoursRemaining}h left in 24h window)`
                    }
                  >
                    <div className="flex items-center justify-center gap-1 w-full">
                      <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-800 dark:text-slate-200 truncate max-w-[75px] sm:max-w-[85px]" title={day.name}>
                        {day.name}
                      </span>
                      {isDayLocked ? (
                        <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      ) : isCurrentSession ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping shrink-0" title="Active Check-in Session" />
                      ) : null}
                    </div>

                    {dayPresent ? (
                      <div className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[8px] sm:text-[9px] font-black shadow-xs">
                        <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                        <span>Present</span>
                        {isDayLocked && <Lock className="w-2 h-2 text-emerald-200 shrink-0" />}
                      </div>
                    ) : dayExcused ? (
                      <div className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[8px] sm:text-[9px] font-black shadow-xs">
                        <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                        <span>Excused</span>
                        {isDayLocked && <Lock className="w-2 h-2 text-slate-700 shrink-0" />}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[8px] sm:text-[9px] font-bold border border-rose-300 dark:border-rose-800">
                        <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-500 shrink-0" />
                        <span>Absent</span>
                        {isDayLocked && <Lock className="w-2 h-2 text-rose-400 shrink-0" />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Expandable History Toggle Button for Admins/Teachers to keep mobile cards beautifully compact */}
        {appRole !== 'student' && (
          <div className="pt-1.5 flex items-center justify-center border-t border-slate-50 dark:border-slate-800/40">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowHistory(!showHistory);
              }}
              className="w-full text-[10px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center gap-1.5 py-1 px-3 bg-slate-50 dark:bg-slate-800/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 border border-slate-200/60 dark:border-slate-800/60 rounded-xl transition-all cursor-pointer select-none active:opacity-80"
            >
              <History className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{showHistory ? 'Hide Previous Sessions' : `Show Previous Sessions (${effectiveClassDays.length})`}</span>
              {showHistory ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
