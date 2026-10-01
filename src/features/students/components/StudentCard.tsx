import React from 'react';
import { Award, GraduationCap, FileText, ChevronRight, AlertTriangle, UserX } from 'lucide-react';
import { Card, Badge } from '../../../components/ui';
import { StudentSummary, ACADEMIC_LEVELS } from '../../../types';

export interface StudentCardProps {
  student: StudentSummary;
  onSelect?: (student: StudentSummary) => void;
  onViewTranscript?: (student: StudentSummary) => void;
  className?: string;
}

export function StudentCard({
  student,
  onSelect,
  onViewTranscript,
  className = '',
}: StudentCardProps) {
  const levelInfo = ACADEMIC_LEVELS.find((l) => l.id === student.levelId) || ACADEMIC_LEVELS[0];
  const rate = student.rate ?? 100;
  const isDroppedOut = student.isDroppedOut || student.enrollmentStatus === 'dropped_out' || student.enrollmentStatus === 'withdrawn';
  const isAtRisk = !isDroppedOut && rate < 75;
  const avgScore = student.avgScore;
  const isHonorRoll = !isDroppedOut && (avgScore ?? 0) >= 85;

  return (
    <Card className={`flex flex-col justify-between transition hover:border-[var(--md-primary)] ${isDroppedOut ? 'opacity-85 border-rose-200 dark:border-rose-900/40 bg-rose-50/10' : ''} ${className}`}>
      <div>
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isDroppedOut ? 'bg-rose-100 dark:bg-rose-950 text-rose-700' : 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'} font-bold text-sm`}>
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                student.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-sm font-bold text-[var(--md-on-surface)] leading-tight">{student.name}</h4>
              </div>
              <p className="text-[11px] text-[var(--md-on-surface-variant)]">{student.studentNumber || 'Student ID: Pending'}</p>
            </div>
          </div>

          {isDroppedOut ? (
            <Badge variant="danger" className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border-rose-300">
              🔴 {student.enrollmentStatus === 'withdrawn' ? 'Withdrawn' : 'Dropped Out'}
            </Badge>
          ) : (
            <Badge variant={isAtRisk ? 'warning' : 'success'}>
              {isAtRisk ? 'At Risk' : 'Good Standing'}
            </Badge>
          )}
        </div>

        {/* Level Tag & Dropout Notes */}
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold border ${levelInfo.color}`}>
            <GraduationCap className="h-3 w-3" />
            {levelInfo.badge}
          </span>
          {isDroppedOut && student.dropoutReason && (
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium truncate max-w-[150px]" title={student.dropoutReason}>
              Reason: {student.dropoutReason}
            </span>
          )}
        </div>

        {/* Attendance & Grade Metrics */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--md-surface-container-high)] p-2.5 text-xs mb-3">
          <div>
            <span className="block text-[10px] text-[var(--md-on-surface-variant)] font-medium">
              Attendance {isDroppedOut && <span className="text-rose-500 font-bold">(Dropped)</span>}
            </span>
            <span className={`font-bold ${isDroppedOut ? 'text-slate-500' : isAtRisk ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {rate}% ({student.attended}/{student.totalDays} d)
            </span>
          </div>

          <div>
            <span className="block text-[10px] text-[var(--md-on-surface-variant)] font-medium">
              Academic Avg {isDroppedOut && <span className="text-slate-400 font-bold">(Archived)</span>}
            </span>
            <span className="font-bold text-[var(--md-on-surface)]">
              {avgScore !== null ? `${avgScore}%` : 'N/A'}
              {isHonorRoll && (
                <Award className="inline h-3.5 w-3.5 text-amber-500 ml-1" />
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-[var(--md-outline-variant)] pt-3 text-xs">
        {onViewTranscript && (
          <button
            type="button"
            onClick={() => onViewTranscript(student)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--md-primary)] hover:underline"
          >
            <FileText className="h-3.5 w-3.5" />
            Transcript
          </button>
        )}

        {onSelect && (
          <button
            type="button"
            onClick={() => onSelect(student)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--md-primary)] hover:underline ml-auto"
          >
            <span>View Profile</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </Card>
  );
}
