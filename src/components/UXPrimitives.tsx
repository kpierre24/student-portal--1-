import React from 'react';
import { AlertCircle, CheckCircle2, Inbox, Loader2, RefreshCw } from 'lucide-react';

type FeedbackTone = 'info' | 'success' | 'warning' | 'danger';

const toneClasses: Record<FeedbackTone, string> = {
  info: 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border-[var(--md-outline-variant)]',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800',
  warning: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800',
  danger: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800',
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="material-page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--md-primary)]">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--md-on-surface)] sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-[var(--md-on-surface-variant)]">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading content…' }: { label?: string }) {
  return (
    <div className="material-feedback flex min-h-40 items-center justify-center rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-8" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-sm font-semibold text-[var(--md-on-surface-variant)]">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--md-primary)]" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="material-feedback flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-8 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--md-primary-container)] text-[var(--md-primary)]" aria-hidden="true">
        {icon || <Inbox className="h-6 w-6" />}
      </div>
      <h2 className="text-base font-bold text-[var(--md-on-surface)]">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-[var(--md-on-surface-variant)]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="material-feedback flex min-h-40 flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/30" role="alert">
      <AlertCircle className="mb-3 h-7 w-7 text-[var(--md-danger)]" aria-hidden="true" />
      <h2 className="text-base font-bold text-[var(--md-on-surface)]">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-[var(--md-on-surface-variant)]">{description}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="md-btn-tonal mt-5 inline-flex items-center gap-2 text-sm">
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  );
}

// ─── Skeleton Primitives ───────────────────────────────────────────────────

/** A single shimmering block — use as the base for all skeleton shapes */
export function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700/60 ${className}`}
    />
  );
}

/** Skeleton for a student profile card (used in StudentsTab / AttendanceTab) */
export function StudentCardSkeleton() {
  return (
    <div aria-hidden="true" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/5" />
          <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-2/5" />
        </div>
        <div className="h-6 w-12 bg-slate-200 dark:bg-slate-700 rounded-lg shrink-0" />
      </div>
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-full" />
      <div className="flex gap-2">
        <div className="h-7 flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        <div className="h-7 flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        <div className="h-7 flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl" />
      </div>
    </div>
  );
}

/** Skeleton grid for a list of student cards */
export function StudentGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading students…"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <StudentCardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Skeleton for a single payment table row */
export function PaymentRowSkeleton() {
  return (
    <tr aria-hidden="true" className="animate-pulse border-b border-slate-100 dark:border-slate-800">
      {[40, 20, 15, 12, 12, 10, 10, 8].map((w, i) => (
        <td key={i} className="px-3 py-2">
          <div className={`h-3 bg-slate-200 dark:bg-slate-700 rounded w-${w === 40 ? 'full' : `${w}/20`}`} />
        </td>
      ))}
    </tr>
  );
}

/** Skeleton for the payment table body */
export function PaymentTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <tbody role="status" aria-label="Loading payments…">
      {Array.from({ length: rows }).map((_, i) => (
        <PaymentRowSkeleton key={i} />
      ))}
      <tr><td><span className="sr-only">Loading…</span></td></tr>
    </tbody>
  );
}

export function StatusBanner({ tone = 'info', children }: { tone?: FeedbackTone; children: React.ReactNode }) {
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${toneClasses[tone]}`} role={tone === 'danger' ? 'alert' : 'status'}>
      {tone === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
      <div>{children}</div>
    </div>
  );
}
