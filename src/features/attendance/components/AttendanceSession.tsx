import React from 'react';
import { Calendar, Lock, Unlock, CheckCheck, XCircle, Plus } from 'lucide-react';
import { ClassDay } from '../../../types';
import { AttendanceSessionStats } from '../types';
import { Card, Button, Badge } from '../../../components/ui';

export interface AttendanceSessionProps {
  classDays: ClassDay[];
  selectedClassDayId: string;
  onSelectClassDay: (id: string) => void;
  sessionStats: AttendanceSessionStats | null;
  onMarkAllPresent?: () => void;
  onMarkAllAbsent?: () => void;
  onCreateSessionClick?: () => void;
  className?: string;
}

export function AttendanceSession({
  classDays,
  selectedClassDayId,
  onSelectClassDay,
  sessionStats,
  onMarkAllPresent,
  onMarkAllAbsent,
  onCreateSessionClick,
  className = '',
}: AttendanceSessionProps) {
  return (
    <Card className={`space-y-4 ${className}`}>
      {/* Top Header & Session Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--md-on-surface)]">Active Class Session</h3>
            <p className="text-[11px] text-[var(--md-on-surface-variant)]">Select session date to view and mark attendance.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Class Day Select */}
          <select
            value={selectedClassDayId}
            onChange={(e) => onSelectClassDay(e.target.value)}
            className="rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-3 py-2 text-xs font-bold text-[var(--md-on-surface)] transition focus:border-[var(--md-primary)] focus:outline-none"
          >
            {classDays.map((day) => (
              <option key={day.id} value={day.id}>
                {day.name} {day.date ? `(${day.date})` : ''}
              </option>
            ))}
          </select>

          {onCreateSessionClick && (
            <Button variant="secondary" size="sm" onClick={onCreateSessionClick}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Session
            </Button>
          )}
        </div>
      </div>

      {/* Session Progress & Stats Bar */}
      {sessionStats && (
        <div className="rounded-xl bg-[var(--md-surface-container-high)] p-3.5 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="text-[var(--md-on-surface)]">{sessionStats.classDayName}</span>
              <Badge variant={sessionStats.isLocked ? 'danger' : 'success'}>
                {sessionStats.isLocked ? (
                  <>
                    <Lock className="h-3 w-3 mr-1 inline" /> Locked
                  </>
                ) : (
                  <>
                    <Unlock className="h-3 w-3 mr-1 inline" /> Open
                  </>
                )}
              </Badge>
            </div>

            <div className="text-[var(--md-primary)] font-extrabold text-sm">
              {sessionStats.attendanceRate}% Attendance
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2.5 w-full rounded-full bg-[var(--md-surface-container-highest)] overflow-hidden flex">
            <div
              style={{ width: `${sessionStats.attendanceRate}%` }}
              className="bg-emerald-500 h-full transition-all duration-300"
            />
          </div>

          {/* Stats Badges */}
          <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--md-on-surface-variant)] pt-1">
            <span>
              Present: <strong className="text-emerald-600 dark:text-emerald-400">{sessionStats.presentCount}</strong>
            </span>
            <span>
              Absent: <strong className="text-rose-600 dark:text-rose-400">{sessionStats.absentCount}</strong>
            </span>
            <span>
              Excused: <strong className="text-amber-600 dark:text-amber-400">{sessionStats.excusedCount}</strong>
            </span>
            <span>
              Total: <strong>{sessionStats.totalStudents}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Batch Action Buttons */}
      {!sessionStats?.isLocked && (onMarkAllPresent || onMarkAllAbsent) && (
        <div className="flex items-center justify-end gap-2 border-t border-[var(--md-outline-variant)] pt-3">
          {onMarkAllPresent && (
            <Button variant="secondary" size="sm" onClick={onMarkAllPresent}>
              <CheckCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />
              Mark All Present
            </Button>
          )}

          {onMarkAllAbsent && (
            <Button variant="ghost" size="sm" onClick={onMarkAllAbsent}>
              <XCircle className="h-3.5 w-3.5 mr-1 text-rose-500" />
              Mark All Absent
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
