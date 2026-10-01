import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = 'Loading content…', className = '' }: LoadingStateProps) {
  return (
    <div
      className={`material-feedback flex min-h-40 items-center justify-center rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-8 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 text-sm font-semibold text-[var(--md-on-surface-variant)]">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--md-primary)]" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}
