import React from 'react';
import { Award, GraduationCap, FileText, ChevronRight, AlertTriangle, UserX } from 'lucide-react';
import { DataTable, Column } from '../../../components/tables/DataTable';
import { EmptyState } from '../../../components/ui';
import { StudentSummary, ACADEMIC_LEVELS } from '../../../types';

export interface StudentTableProps {
  students: StudentSummary[];
  onSelectStudent?: (student: StudentSummary) => void;
  onViewTranscript?: (student: StudentSummary) => void;
  className?: string;
}

export function StudentTable({
  students,
  onSelectStudent,
  onViewTranscript,
  className = '',
}: StudentTableProps) {
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
                <span>{student.studentNumber || 'No ID assigned'}</span>
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
      header: 'Academic Level',
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
      key: 'rate',
      header: 'Attendance Rate',
      render: (student) => {
        const isDroppedOut = student.isDroppedOut || student.enrollmentStatus === 'dropped_out' || student.enrollmentStatus === 'withdrawn';
        const rate = student.rate ?? 100;
        const isAtRisk = !isDroppedOut && rate < 75;
        return (
          <div className="flex items-center gap-1.5">
            <span className={`font-bold text-xs ${isDroppedOut ? 'text-slate-500' : isAtRisk ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {rate}%
            </span>
            <span className="text-[10px] text-[var(--md-on-surface-variant)]">
              ({student.attended}/{student.totalDays} d){isDroppedOut ? ' (Dropped)' : ''}
            </span>
            {isAtRisk && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-label="At Risk" />}
          </div>
        );
      },
    },
    {
      key: 'avgScore',
      header: 'Quiz & Exam Average',
      render: (student) => {
        const isDroppedOut = student.isDroppedOut || student.enrollmentStatus === 'dropped_out' || student.enrollmentStatus === 'withdrawn';
        const avgScore = student.avgScore;
        const isHonorRoll = !isDroppedOut && (avgScore ?? 0) >= 85;
        return (
          <div className="flex items-center gap-1 font-bold text-xs text-[var(--md-on-surface)]">
            <span className={isDroppedOut ? 'text-slate-500' : ''}>
              {avgScore !== null ? `${avgScore}%` : 'N/A'} {isDroppedOut ? '(Archived)' : ''}
            </span>
            {isHonorRoll && <Award className="h-3.5 w-3.5 text-amber-500" aria-label="Honor Roll" />}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (student) => (
        <div className="flex items-center justify-end gap-2">
          {onViewTranscript && (
            <button
              type="button"
              onClick={() => onViewTranscript(student)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-2 py-1 text-[10px] font-bold text-[var(--md-primary)] hover:bg-[var(--md-surface-container-high)] cursor-pointer"
            >
              <FileText className="h-3 w-3" />
              Transcript
            </button>
          )}

          {onSelectStudent && (
            <button
              type="button"
              onClick={() => onSelectStudent(student)}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--md-primary)] px-2 py-1 text-[10px] font-bold text-white hover:opacity-90 cursor-pointer"
            >
              Profile
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      ),
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
            description="Try adjusting your search criteria, level filters, or enrollment status."
          />
        }
      />
    </div>
  );
}
