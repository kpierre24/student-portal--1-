import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tonal' | 'outline' | 'ghost' | 'danger' | 'accent' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...props
}, ref) => {
  const variantClasses = {
    primary:
      'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] active:scale-[0.98] shadow-xs hover:shadow-sm dark:bg-[#026cb8] dark:hover:bg-[#025798]',
    secondary:
      'bg-[var(--md-surface-container)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--md-surface-container-high)] active:scale-[0.98] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100',
    tonal:
      'bg-[var(--md-primary-container)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/15 active:scale-[0.98] dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-900/60',
    accent:
      'bg-[var(--color-accent)] text-slate-950 font-bold hover:brightness-105 active:scale-[0.98] shadow-xs',
    outline:
      'border border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface)] active:scale-[0.98] dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800/60',
    ghost:
      'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] active:scale-[0.98] dark:hover:bg-slate-800/50 dark:hover:text-slate-100',
    danger:
      'bg-[var(--color-danger)] text-white hover:opacity-90 active:scale-[0.98] shadow-xs',
    success:
      'bg-[var(--color-success)] text-white hover:opacity-90 active:scale-[0.98] shadow-xs',
  };

  const sizeClasses = {
    xs: 'px-2.5 py-1 text-xs font-medium rounded-md min-h-[30px]',
    sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[36px]',
    md: 'px-4 py-2 text-sm font-semibold rounded-xl min-h-[44px]',
    lg: 'px-6 py-3 text-base font-semibold rounded-xl min-h-[48px]',
    icon: 'p-2 rounded-xl min-h-[40px] min-w-[40px] aspect-square',
  };

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 transition-all font-medium select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 ${
        fullWidth ? 'w-full' : ''
      } ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0 text-current" aria-hidden="true" />
      ) : leftIcon ? (
        <span className="shrink-0 inline-flex items-center">{leftIcon}</span>
      ) : null}
      <span className="truncate">{children}</span>
      {!isLoading && rightIcon && (
        <span className="shrink-0 inline-flex items-center">{rightIcon}</span>
      )}
    </button>
  );
});

Button.displayName = 'Button';
