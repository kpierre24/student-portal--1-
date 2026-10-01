import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertOctagon,
  AlertCircle,
  FileEdit,
  Award,
  Sparkles,
  Check,
  XCircle,
  ShieldCheck,
  PieChart,
  RefreshCw,
  PauseCircle,
  Eye,
  Archive,
  CheckCheck,
  HelpCircle,
} from 'lucide-react';

export type StandardStatus =
  | 'graded'
  | 'pending'
  | 'submitted'
  | 'pending_review'
  | 'needs_review'
  | 'in_progress'
  | 'draft'
  | 'overdue'
  | 'late'
  | 'passed'
  | 'failed'
  | 'honors'
  | 'high_distinction'
  | 'satisfactory'
  | 'at_risk'
  | 'at-risk'
  | 'critical'
  | 'present'
  | 'absent'
  | 'excused'
  | 'paid'
  | 'partial'
  | 'unpaid'
  | 'waived'
  | 'verified'
  | 'active'
  | 'inactive'
  | 'synced'
  | 'syncing'
  | 'conflict'
  | 'published'
  | 'archived'
  | string;

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StandardStatus;
  label?: string;
  icon?: React.ReactNode;
  showIcon?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

interface StatusConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  classes: string;
}

function resolveStatusConfig(rawStatus: string): StatusConfig {
  const s = (rawStatus || '').toLowerCase().trim().replace(/[\s_-]+/g, '_');

  switch (s) {
    // Assessments & Academics
    case 'graded':
      return {
        label: 'Graded',
        icon: CheckCircle2,
        classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      };
    case 'pending':
    case 'submitted':
    case 'pending_review':
    case 'needs_review':
      return {
        label: 'Pending Review',
        icon: Clock,
        classes: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
      };
    case 'in_progress':
    case 'draft':
      return {
        label: 'Draft',
        icon: FileEdit,
        classes: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700',
      };
    case 'overdue':
    case 'late':
      return {
        label: 'Overdue',
        icon: AlertTriangle,
        classes: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
      };
    case 'passed':
    case 'pass':
      return {
        label: 'Passed',
        icon: Award,
        classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      };
    case 'failed':
    case 'fail':
      return {
        label: 'Failed',
        icon: XCircle,
        classes: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
      };
    case 'honors':
    case 'high_distinction':
      return {
        label: 'High Distinction',
        icon: Sparkles,
        classes: 'bg-amber-50 text-amber-900 border-amber-300/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700/60',
      };
    case 'satisfactory':
      return {
        label: 'Satisfactory',
        icon: Check,
        classes: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
      };
    case 'at_risk':
      return {
        label: 'At-Risk',
        icon: AlertTriangle,
        classes: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
      };
    case 'critical':
      return {
        label: 'Critical',
        icon: AlertOctagon,
        classes: 'bg-red-100 text-red-900 border-red-300 font-bold dark:bg-red-950/60 dark:text-red-200 dark:border-red-800',
      };

    // Attendance
    case 'present':
    case 'p':
      return {
        label: 'Present',
        icon: Check,
        classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      };
    case 'absent':
    case 'a':
      return {
        label: 'Absent',
        icon: XCircle,
        classes: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
      };
    case 'excused':
    case 'e':
      return {
        label: 'Excused',
        icon: ShieldCheck,
        classes: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
      };

    // Finance & Payments
    case 'paid':
    case 'paid_in_full':
      return {
        label: 'Paid',
        icon: CheckCircle2,
        classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      };
    case 'partial':
    case 'partial_payment':
      return {
        label: 'Partial',
        icon: PieChart,
        classes: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
      };
    case 'unpaid':
    case 'due':
      return {
        label: 'Unpaid',
        icon: AlertCircle,
        classes: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
      };
    case 'waived':
    case 'scholarship':
      return {
        label: 'Waived',
        icon: CheckCheck,
        classes: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
      };
    case 'verified':
      return {
        label: 'Verified',
        icon: ShieldCheck,
        classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      };

    // System Status
    case 'active':
      return {
        label: 'Active',
        icon: CheckCircle2,
        classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      };
    case 'inactive':
      return {
        label: 'Inactive',
        icon: PauseCircle,
        classes: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      };
    case 'syncing':
      return {
        label: 'Syncing',
        icon: RefreshCw,
        classes: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
      };
    case 'synced':
      return {
        label: 'Synced',
        icon: CheckCircle2,
        classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      };
    case 'conflict':
      return {
        label: 'Conflict',
        icon: AlertTriangle,
        classes: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
      };
    case 'published':
      return {
        label: 'Published',
        icon: Eye,
        classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      };
    case 'archived':
      return {
        label: 'Archived',
        icon: Archive,
        classes: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      };

    default:
      return {
        label: rawStatus || 'Unknown',
        icon: HelpCircle,
        classes: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      };
  }
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  icon,
  showIcon = true,
  size = 'sm',
  className = '',
  ...props
}) => {
  const config = React.useMemo(() => resolveStatusConfig(status), [status]);
  const IconComponent = config.icon;
  const displayLabel = label || config.label;

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[11px] font-semibold gap-1',
    sm: 'px-2.5 py-0.5 text-xs font-semibold gap-1.5',
    md: 'px-3 py-1 text-sm font-semibold gap-1.5',
    lg: 'px-3.5 py-1.5 text-base font-semibold gap-2',
  };

  const iconSizes = {
    xs: 'h-3 w-3',
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-4.5 w-4.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border whitespace-nowrap transition-colors select-none ${config.classes} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {showIcon && (
        <span className="shrink-0 inline-flex items-center">
          {icon || <IconComponent className={`${iconSizes[size]} shrink-0`} aria-hidden="true" />}
        </span>
      )}
      <span>{displayLabel}</span>
    </span>
  );
};
