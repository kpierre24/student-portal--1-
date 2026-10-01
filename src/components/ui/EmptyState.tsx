import React from 'react';
import {
  Inbox,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Search,
  BellOff,
  FolderOpen,
} from 'lucide-react';

export type EmptyStatePreset =
  | 'student_caught_up'
  | 'teacher_no_submissions'
  | 'admin_no_conflicts'
  | 'no_results'
  | 'no_notifications'
  | 'no_records';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  preset?: EmptyStatePreset;
  compact?: boolean;
  className?: string;
}

const PRESET_CONFIGS: Record<
  EmptyStatePreset,
  { title: string; description: string; icon: React.ReactNode; tone: string }
> = {
  student_caught_up: {
    title: "You're all caught up 🎉",
    description: 'There are no outstanding assignments or pending coursework at this time.',
    icon: <Sparkles className="h-7 w-7 text-amber-600 dark:text-amber-400" />,
    tone: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  },
  teacher_no_submissions: {
    title: 'No submissions to review',
    description: 'All student submissions and quizzes have been reviewed and graded.',
    icon: <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />,
    tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  admin_no_conflicts: {
    title: 'No synchronization conflicts',
    description: 'Local records, database backups, and Google Sheets are completely in sync.',
    icon: <ShieldCheck className="h-7 w-7 text-[var(--color-primary)] dark:text-sky-400" />,
    tone: 'bg-[var(--md-primary-container)] text-[var(--color-primary)] dark:bg-sky-950/60 dark:text-sky-300',
  },
  no_results: {
    title: 'No results found',
    description: 'Try adjusting your search criteria or filters to find what you are looking for.',
    icon: <Search className="h-7 w-7 text-[var(--color-text-muted)]" />,
    tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  no_notifications: {
    title: 'No new notifications',
    description: 'You are completely caught up with your announcements and activity updates.',
    icon: <BellOff className="h-7 w-7 text-[var(--color-text-muted)]" />,
    tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  no_records: {
    title: 'No records available',
    description: 'No entries have been created yet. Add a new item to get started.',
    icon: <FolderOpen className="h-7 w-7 text-[var(--color-text-muted)]" />,
    tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
};

export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  icon,
  preset,
  compact = false,
  className = '',
}: EmptyStateProps) {
  const presetConfig = preset ? PRESET_CONFIGS[preset] : null;
  const resolvedTitle = title || presetConfig?.title || 'No data available';
  const resolvedDescription = description || presetConfig?.description;

  const renderIcon = () => {
    if (icon) {
      if (typeof icon === 'function') {
        const IconComp = icon as React.ComponentType<{ className?: string }>;
        return <IconComp className="h-7 w-7" />;
      }
      return icon;
    }
    if (presetConfig) {
      return presetConfig.icon;
    }
    return <Inbox className="h-7 w-7" />;
  };

  const toneClass =
    presetConfig?.tone ||
    'bg-[var(--md-primary-container)] text-[var(--color-primary)] dark:bg-sky-950/60 dark:text-sky-300';

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-center transition-all dark:bg-slate-900/40 dark:border-slate-800 ${
        compact ? 'p-6 min-h-36' : 'p-8 sm:p-12 min-h-52'
      } ${className}`}
      role="status"
    >
      <div
        className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-xs transition-transform ${toneClass}`}
        aria-hidden="true"
      >
        {renderIcon()}
      </div>
      <h3 className="text-base sm:text-lg font-bold text-[var(--color-text)] dark:text-slate-100">
        {resolvedTitle}
      </h3>
      {resolvedDescription && (
        <p className="mt-1.5 max-w-md text-xs sm:text-sm text-[var(--color-text-muted)] dark:text-slate-400">
          {resolvedDescription}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
