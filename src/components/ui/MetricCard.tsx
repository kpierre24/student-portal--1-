import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from './Card';
import { Skeleton } from './Skeleton';

export interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: string | number;
  change?: string | number;
  changeType?: 'increase' | 'decrease' | 'neutral' | 'positive' | 'negative';
  trendType?: 'increase' | 'decrease' | 'neutral' | 'positive' | 'negative';
  icon?: React.ReactNode;
  tone?: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  caption?: string;
  badge?: string;
  isLoading?: boolean;
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  trend,
  change,
  changeType,
  trendType,
  icon,
  tone = 'primary',
  caption,
  badge,
  isLoading = false,
  onClick,
  className = '',
}) => {
  const displayTrend = trend !== undefined ? trend : change;
  
  // Calculate trend direction
  const resolvedType = React.useMemo(() => {
    const specified = trendType || changeType;
    if (specified) {
      if (specified === 'positive' || specified === 'increase') return 'increase';
      if (specified === 'negative' || specified === 'decrease') return 'decrease';
      return 'neutral';
    }
    if (displayTrend === undefined) return 'neutral';
    const str = String(displayTrend).trim();
    if (str.startsWith('+') || str.toLowerCase().includes('up')) return 'increase';
    if (str.startsWith('-') || str.toLowerCase().includes('down')) return 'decrease';
    const num = parseFloat(str);
    if (!isNaN(num)) {
      if (num > 0) return 'increase';
      if (num < 0) return 'decrease';
    }
    return 'neutral';
  }, [displayTrend, trendType, changeType]);
  const toneClasses = {
    primary:
      'bg-[var(--md-primary-container)] text-[var(--color-primary)] dark:bg-sky-950/60 dark:text-sky-300',
    accent:
      'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300',
    success:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    warning:
      'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300',
    danger:
      'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
    info:
      'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  };

  if (isLoading) {
    return (
      <Card className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton variant="circular" className="h-10 w-10" />
        </div>
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-36" />
      </Card>
    );
  }

  return (
    <Card
      onClick={onClick}
      variant={onClick ? 'interactive' : 'default'}
      className={`relative overflow-hidden transition-all ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] dark:text-slate-400">
            {label}
          </p>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text)] dark:text-slate-100 font-sans">
              {value}
            </span>

            {badge && (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {badge}
              </span>
            )}
          </div>
        </div>

        {icon && (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform ${toneClasses[tone]}`}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>

      {(displayTrend !== undefined || caption) && (
        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-[var(--color-border)]/60 text-xs dark:border-slate-800/60">
          {displayTrend !== undefined && (
            <span
              className={`inline-flex items-center gap-0.5 font-bold ${
                resolvedType === 'increase'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : resolvedType === 'decrease'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-[var(--color-text-muted)] dark:text-slate-400'
              }`}
            >
              {resolvedType === 'increase' && <TrendingUp className="h-3.5 w-3.5" />}
              {resolvedType === 'decrease' && <TrendingDown className="h-3.5 w-3.5" />}
              {resolvedType === 'neutral' && <Minus className="h-3.5 w-3.5" />}
              <span>{displayTrend}</span>
            </span>
          )}

          {caption && (
            <span className="truncate text-[var(--color-text-muted)] dark:text-slate-400">
              {caption}
            </span>
          )}
        </div>
      )}
    </Card>
  );
};
