import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
  className?: string;
}

export function LoadingState({
  label = 'Loading content…',
  size = 'md',
  fullHeight = false,
  className = '',
}: LoadingStateProps) {
  const spinnerSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div
      className={`flex items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center dark:bg-slate-900/40 dark:border-slate-800 ${
        fullHeight ? 'min-h-[60vh]' : 'min-h-40'
      } ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 text-sm font-semibold text-[var(--color-text-muted)] dark:text-slate-300">
        <Loader2
          className={`animate-spin text-[var(--color-primary)] dark:text-sky-400 ${spinnerSizes[size]}`}
          aria-hidden="true"
        />
        <span>{label}</span>
      </div>
    </div>
  );
}
