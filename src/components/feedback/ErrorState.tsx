import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`material-feedback flex min-h-40 flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/30 ${className}`}
      role="alert"
    >
      <AlertCircle className="mb-3 h-7 w-7 text-[var(--md-danger)]" aria-hidden="true" />
      <h2 className="text-base font-bold text-[var(--md-on-surface)]">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-[var(--md-on-surface-variant)]">{description}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="md-btn-tonal mt-5 inline-flex items-center gap-2 text-sm"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  );
}
