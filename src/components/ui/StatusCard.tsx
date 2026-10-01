import React from 'react';
import { Card } from './Card';
import { Badge } from './Badge';

export type StatusCardType = 'active' | 'pending' | 'at-risk' | 'completed' | 'warning' | 'critical' | 'info';

export interface StatusCardProps {
  status: StatusCardType;
  title: string;
  subtitle?: string;
  description?: string;
  badgeText?: string;
  timestamp?: string;
  progress?: number;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  status,
  title,
  subtitle,
  description,
  badgeText,
  timestamp,
  progress,
  action,
  icon,
  className = '',
}) => {
  const statusConfig: Record<
    StatusCardType,
    { badgeVariant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; dotColor: string }
  > = {
    active: { badgeVariant: 'success', dotColor: 'bg-emerald-500 ring-emerald-300' },
    completed: { badgeVariant: 'info', dotColor: 'bg-sky-500 ring-sky-300' },
    pending: { badgeVariant: 'warning', dotColor: 'bg-amber-500 ring-amber-300' },
    'at-risk': { badgeVariant: 'danger', dotColor: 'bg-red-500 ring-red-300' },
    warning: { badgeVariant: 'warning', dotColor: 'bg-amber-500 ring-amber-300' },
    critical: { badgeVariant: 'danger', dotColor: 'bg-red-500 ring-red-300 animate-pulse' },
    info: { badgeVariant: 'info', dotColor: 'bg-blue-500 ring-blue-300' },
  };

  const config = statusConfig[status];

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {icon ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)] dark:bg-slate-900 dark:border-slate-800">
              {icon}
            </div>
          ) : (
            <span className="mt-1.5 flex h-3 w-3 shrink-0 relative">
              <span className={`h-full w-full rounded-full ring-4 ${config.dotColor}`} />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-bold text-[var(--color-text)] dark:text-slate-100 truncate">
                {title}
              </h4>
              <Badge variant={config.badgeVariant} size="sm">
                {badgeText || status.toUpperCase()}
              </Badge>
            </div>

            {subtitle && (
              <p className="mt-0.5 text-xs font-medium text-[var(--color-text-muted)] dark:text-slate-400">
                {subtitle}
              </p>
            )}

            {description && (
              <p className="mt-2 text-sm text-[var(--color-text)]/90 dark:text-slate-300">
                {description}
              </p>
            )}
          </div>
        </div>

        {timestamp && (
          <span className="text-xs text-[var(--color-text-muted)] dark:text-slate-400 shrink-0">
            {timestamp}
          </span>
        )}
      </div>

      {progress !== undefined && (
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-[var(--color-text-muted)]">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all ${
                progress >= 75
                  ? 'bg-emerald-500'
                  : progress >= 50
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      {action && <div className="mt-4 pt-3 border-t border-[var(--color-border)] dark:border-slate-800 flex items-center justify-end gap-2">{action}</div>}
    </Card>
  );
};
