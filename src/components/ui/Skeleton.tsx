import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'rounded';
  width?: string | number;
  height?: string | number;
}

/**
 * Universal Skeleton primitive with accessible aria-hidden, dark mode, and reduced motion fallback.
 */
export function Skeleton({
  variant = 'rounded',
  className = '',
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  const variantClasses = {
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
    circular: 'rounded-full',
  };

  const inlineStyles: React.CSSProperties = {
    width,
    height,
    ...style,
  };

  return (
    <div
      aria-hidden="true"
      style={inlineStyles}
      className={`animate-pulse bg-slate-200/80 dark:bg-slate-800/80 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}

export const SkeletonBlock = Skeleton;

export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3.5 ${
            i === lines - 1 ? 'w-3/5' : i === 0 ? 'w-full' : 'w-4/5'
          }`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 space-y-4 dark:bg-[#08182c] dark:border-slate-800 ${className}`}
    >
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="h-10 w-10 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = '',
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={`w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] dark:bg-[#08182c] dark:border-slate-800 ${className}`}
      role="status"
      aria-label="Loading table data…"
    >
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex gap-4 dark:bg-slate-900/60 dark:border-slate-800">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-[var(--color-border)] dark:divide-slate-800/60">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex gap-4 items-center">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({
  items = 4,
  className = '',
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div
      className={`space-y-3 ${className}`}
      role="status"
      aria-label="Loading list items…"
    >
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] dark:bg-[#08182c] dark:border-slate-800"
        >
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <Skeleton variant="circular" className="h-11 w-11 shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </div>
          <Skeleton className="h-8 w-20 shrink-0 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`space-y-6 ${className}`}
      role="status"
      aria-label="Loading dashboard view…"
    >
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* 4 Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] space-y-3 dark:bg-[#08182c] dark:border-slate-800"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton variant="circular" className="h-10 w-10" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>

      {/* Main split content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SkeletonTable rows={4} columns={4} />
        </div>
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonList items={2} />
        </div>
      </div>
    </div>
  );
}

/** Legacy & Domain-specific skeletons for backwards compatibility */
export {
  StudentCardSkeleton,
  StudentGridSkeleton,
  PaymentRowSkeleton,
  PaymentTableSkeleton,
} from '../UXPrimitives';
