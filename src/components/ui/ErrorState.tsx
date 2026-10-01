import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  action,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex min-h-40 flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/70 p-8 text-center dark:border-red-900/60 dark:bg-red-950/30 ${className}`}
      role="alert"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold text-[var(--color-text)] dark:text-slate-100">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm text-[var(--color-text-muted)] dark:text-slate-400">
          {description}
        </p>
      )}
      {(onRetry || action) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
            >
              Try again
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
