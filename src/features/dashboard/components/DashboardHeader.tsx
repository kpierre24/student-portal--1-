import React from 'react';
import { Calendar, Shield, Sparkles, User, Award, CheckCircle } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';

export interface DashboardHeaderProps {
  greeting: string;
  userName: string;
  role: 'admin' | 'teacher' | 'student' | 'visitor';
  cohortName?: string;
  scriptureText?: string;
  scriptureRef?: string;
  className?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  greeting,
  userName,
  role,
  cohortName = 'Class of 2026',
  scriptureText = 'Study to show thyself approved unto God, a workman that needeth not to be ashamed.',
  scriptureRef = '2 Timothy 2:15',
  className = '',
}) => {
  const roleConfig = {
    admin: {
      label: 'Administrator',
      badgeVariant: 'primary' as const,
      icon: Shield,
    },
    teacher: {
      label: 'Faculty & Pastoral Leader',
      badgeVariant: 'accent' as const,
      icon: Award,
    },
    student: {
      label: 'Ministry Student',
      badgeVariant: 'info' as const,
      icon: User,
    },
    visitor: {
      label: 'Visitor',
      badgeVariant: 'neutral' as const,
      icon: User,
    },
  }[role] || {
    label: 'Ministry Student',
    badgeVariant: 'info' as const,
    icon: User,
  };

  const RoleIcon = roleConfig.icon;

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 sm:p-8 shadow-sm dark:bg-[#08182c] dark:border-slate-800 ${className}`}
    >
      {/* Decorative subtle background gradient */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[var(--color-primary)]/5 blur-3xl dark:bg-sky-500/10"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={roleConfig.badgeVariant} size="sm" icon={<RoleIcon className="h-3.5 w-3.5" />}>
              {roleConfig.label}
            </Badge>

            <span className="text-xs font-medium text-[var(--color-text-muted)] dark:text-slate-400">
              •
            </span>

            <span className="text-xs font-medium text-[var(--color-text-muted)] dark:text-slate-400">
              {cohortName}
            </span>

            <span className="text-xs font-medium text-[var(--color-text-muted)] dark:text-slate-400">
              •
            </span>

            <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-text-muted)] dark:text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
              {todayFormatted}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text)] dark:text-slate-100 font-sans">
            {greeting}, <span className="text-[var(--color-primary)] dark:text-sky-400">{userName}</span> 👋
          </h1>

          <p className="max-w-2xl text-xs sm:text-sm text-[var(--color-text-muted)] dark:text-slate-400">
            Here's what you need to know today.
          </p>
        </div>

        {/* Scripture / Inspiration banner on desktop */}
        {scriptureText && (
          <div className="max-w-xs md:max-w-sm rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3.5 text-xs text-amber-950 shadow-2xs dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Word of the Day</span>
            </div>
            <blockquote className="italic font-serif leading-relaxed text-[11px] sm:text-xs">
              "{scriptureText}"
            </blockquote>
            <p className="mt-1 text-right font-sans text-[10px] font-bold text-amber-900 dark:text-amber-300">
              — {scriptureRef}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
