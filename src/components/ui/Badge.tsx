import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'primary' | 'accent' | 'outline';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = 'info',
  size = 'sm',
  icon,
  children,
  className = '',
  ...props
}: BadgeProps) {
  const variantClasses = {
    info: 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--color-border)] dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
    primary:
      'bg-[var(--color-primary)] text-white border border-transparent shadow-xs',
    accent:
      'bg-amber-100 text-amber-900 border border-amber-300/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700/60',
    success:
      'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800',
    warning:
      'bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800',
    danger:
      'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800',
    neutral:
      'bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    outline:
      'bg-transparent text-[var(--color-text)] border border-[var(--color-border)] dark:text-slate-200 dark:border-slate-700',
  };

  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-xs font-semibold',
    md: 'px-3 py-1 text-sm font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full whitespace-nowrap transition-colors ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0 inline-flex items-center">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
