import React from 'react';
import { User, Calendar, Award, CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

export type AssessmentStatus = 'graded' | 'submitted' | 'pending' | 'overdue' | 'in_progress';

export interface MobileAssessmentCardProps {
  studentName: string;
  courseTitle: string;
  assignmentTitle?: string;
  submittedDate?: string;
  dueDate?: string;
  score?: number | string | null;
  status: AssessmentStatus;
  onView?: () => void;
  actionLabel?: string;
  className?: string;
}

export const MobileAssessmentCard: React.FC<MobileAssessmentCardProps> = ({
  studentName,
  courseTitle,
  assignmentTitle,
  submittedDate,
  dueDate,
  score,
  status,
  onView,
  actionLabel = 'View',
  className = '',
}) => {
  const statusConfig: Record<
    AssessmentStatus,
    { label: string; variant: 'success' | 'info' | 'warning' | 'danger' | 'neutral' }
  > = {
    graded: { label: 'Graded', variant: 'success' },
    submitted: { label: 'Submitted', variant: 'info' },
    pending: { label: 'Pending', variant: 'warning' },
    overdue: { label: 'Overdue', variant: 'danger' },
    in_progress: { label: 'In Progress', variant: 'neutral' },
  };

  const currentStatus = statusConfig[status] || statusConfig.pending;

  return (
    <Card
      variant="default"
      className={`relative overflow-hidden transition-all hover:border-[var(--color-primary)]/40 hover:shadow-md ${className}`}
    >
      <div className="space-y-3.5">
        {/* Header: Student Name & Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-base font-black text-[var(--color-text)] dark:text-slate-100 truncate font-sans">
              {studentName}
            </h4>
            <p className="text-xs font-semibold text-[var(--color-primary)] dark:text-sky-400 truncate mt-0.5">
              {courseTitle}
            </p>
            {assignmentTitle && (
              <p className="text-xs text-[var(--color-text-muted)] dark:text-slate-400 truncate mt-0.5">
                {assignmentTitle}
              </p>
            )}
          </div>

          <Badge variant={currentStatus.variant} size="sm">
            {currentStatus.label}
          </Badge>
        </div>

        {/* Metadata Details (Submitted Date, Score, Status) */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-900/50 border border-[var(--color-border)]/60 dark:border-slate-800">
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] block">
              {submittedDate ? 'Submitted' : 'Due Date'}
            </span>
            <span className="font-semibold text-[var(--color-text)] dark:text-slate-200 truncate block">
              {submittedDate || dueDate || '—'}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] block">
              Score
            </span>
            <span
              className={`font-black text-sm block ${
                typeof score === 'number' && score >= 85
                  ? 'text-amber-600 dark:text-amber-400'
                  : typeof score === 'number' && score >= 75
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : typeof score === 'number'
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-500'
              }`}
            >
              {score !== undefined && score !== null ? (typeof score === 'number' ? `${score}%` : score) : 'Pending'}
            </span>
          </div>
        </div>

        {/* Action Button */}
        {onView && (
          <div className="pt-1">
            <Button
              size="sm"
              variant="outline"
              fullWidth
              onClick={onView}
              rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
            >
              {actionLabel}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
