import React from 'react';
import { Check, X, ShieldAlert, AlertTriangle, GraduationCap, UserX } from 'lucide-react';
import { DataTable, Column } from '../../../components/tables/DataTable';
import { EmptyState, Badge } from '../../../components/ui';
import { StudentSummary, ACADEMIC_LEVELS } from '../../../types';
import { AttendanceStatus } from '../types';
import { getStudentAttendanceStatus } from '../services/attendanceService';

export interface AttendanceTableProps {
  students: StudentSummary[];
  classDayId: string;
  onToggleAttendance: (studentName: string, classDayId: string, status: AttendanceStatus) => void;
  excusedAbsences?: Record<string, Record<string, boolean>>;
  isLocked?: boolean;
  className?: string;
}

export function AttendanceTable({
  students,
  classDayId,
  onToggleAttendance,
  excusedAbsences = {},
  isLocked = false,
  className = '',
}: AttendanceTableProps) {
  const columns: Column<StudentSummary>[] = [
    {
      key: 'name',
      header: 'Student Name',
      render: (student) => {
        const isDroppedOut = student.isDroppedOut || student.enrollmentStatus === 'dropped_out' || student.enrollmentStatus === 'withdrawn';
        return (
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-xs ${isDroppedOut ? 'bg-rose-100 dark:bg-rose-950 text-rose-700' : 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'}`}>
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.name} className="h-full w-full rounded-xl object-cover" />
              ) : (
                student.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-xs text-[var(--md-on-surface)]">{student.name}</span>
                {isDroppedOut && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-sm text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
                    🔴 {student.enrollmentStatus === 'withdrawn' ? 'Withdrawn' : 'Dropped Out'}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[var(--md-on-surface-variant)] flex items-center gap-1">
                <span>{student.studentNumber || 'Student ID'}</span>
                {isDroppedOut && student.dropoutReason && (
                  <span className="text-rose-600 dark:text-rose-400 font-medium">· {student.dropoutReason}</span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'levelId',
      header: 'Level',
      render: (student) => {
        const level = ACADEMIC_LEVELS.find((l) => l.id === student.levelId) || ACADEMIC_LEVELS[0];
        return (
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${level.color}`}>
            <GraduationCap className="h-3 w-3" />
            {level.badge}
          </span>
        );
      },
    },
    {
      key: 'overallRate',
      header: 'Overall Rate',
      render: (student) => {
        const isDroppedOut = student.isDroppedOut || student.enrollmentStatus === 'dropped_out' || student.enrollmentStatus === 'withdrawn';
        const rate = student.rate ?? 100;
        const isAtRisk = !isDroppedOut && rate < 75;
        return (
          <div className="flex items-center gap-1 font-bold text-xs">
            <span className={isDroppedOut ? 'text-slate-500' : isAtRisk ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
              {rate}% {isDroppedOut ? '(Dropped)' : ''}
            </span>
            {isAtRisk && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-label="At Risk" />}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Session Attendance',
      className: 'text-right',
      render: (student) => {
        const status = getStudentAttendanceStatus(student, classDayId, excusedAbsences);

        if (isLocked) {
          return (
            <div className="flex justify-end">
              <Badge variant={status === 'present' ? 'success' : status === 'excused' ? 'warning' : 'danger'}>
                {status.toUpperCase()}
              </Badge>
            </div>
          );
        }

        return (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => onToggleAttendance(student.name, classDayId, 'present')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition cursor-pointer ${
                status === 'present'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] hover:bg-emerald-100 dark:hover:bg-emerald-950'
              }`}
            >
              <Check className="h-3 w-3" />
              <span>Present</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleAttendance(student.name, classDayId, 'absent')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition cursor-pointer ${
                status === 'absent'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] hover:bg-red-100 dark:hover:bg-red-950'
              }`}
            >
              <X className="h-3 w-3" />
              <span>Absent</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleAttendance(student.name, classDayId, 'excused')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition cursor-pointer ${
                status === 'excused'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] hover:bg-amber-100 dark:hover:bg-amber-950'
              }`}
            >
              <ShieldAlert className="h-3 w-3" />
              <span>Excused</span>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className={`overflow-hidden rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface)] ${className}`}>
      <DataTable
        columns={columns}
        data={students}
        keyExtractor={(item) => item.id || item.name}
        emptyState={
          <EmptyState
            title="No students found"
            description="There are no students enrolled in this session."
          />
        }
      />
    </div>
  );
}
