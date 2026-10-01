import React from 'react';
import { Clock, Edit3, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';
import { normalizeGradeStage } from '../services/gradesService';

interface GradeStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const GradeStatusBadge: React.FC<GradeStatusBadgeProps> = ({
  status,
  size = 'md',
  showLabel = true,
}) => {
  const stage = normalizeGradeStage(status);

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  switch (stage) {
    case 'SUBMITTED':
      return (
        <span
          className={`inline-flex items-center rounded-md font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 ${sizeClasses}`}
        >
          <Clock className={iconSizes} />
          {showLabel && <span>Submitted</span>}
        </span>
      );

    case 'GRADED':
      return (
        <span
          className={`inline-flex items-center rounded-md font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 ${sizeClasses}`}
        >
          <Edit3 className={iconSizes} />
          {showLabel && <span>Graded</span>}
        </span>
      );

    case 'MODERATION':
      return (
        <span
          className={`inline-flex items-center rounded-md font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 ${sizeClasses}`}
        >
          <ShieldAlert className={iconSizes} />
          {showLabel && <span>Moderation</span>}
        </span>
      );

    case 'RELEASED':
      return (
        <span
          className={`inline-flex items-center rounded-md font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 ${sizeClasses}`}
        >
          <CheckCircle2 className={iconSizes} />
          {showLabel && <span>Released</span>}
        </span>
      );

    case 'LOCKED':
      return (
        <span
          className={`inline-flex items-center rounded-md font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 ${sizeClasses}`}
        >
          <Lock className={iconSizes} />
          {showLabel && <span>Locked</span>}
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center rounded-md font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 ${sizeClasses}`}
        >
          {showLabel && <span>{status}</span>}
        </span>
      );
  }
};
