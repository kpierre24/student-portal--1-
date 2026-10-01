import React, { useId } from 'react';
import { X } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  helperText,
  error,
  leftIcon,
  rightIcon,
  clearable = false,
  onClear,
  id,
  className = '',
  disabled,
  value,
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  const hasValue = value !== undefined && value !== null && String(value).length > 0;

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] dark:text-slate-300"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="pointer-events-none absolute left-3.5 flex items-center text-[var(--color-text-muted)] dark:text-slate-400">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`w-full rounded-xl border bg-[var(--color-surface-elevated)] px-3.5 py-2.5 text-sm text-[var(--color-text)] transition-all min-h-[44px] placeholder:text-[var(--color-text-muted)]/70 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900/90 dark:text-slate-100 ${
            leftIcon ? 'pl-10' : ''
          } ${rightIcon || (clearable && hasValue) ? 'pr-10' : ''} ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500'
              : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20 dark:border-slate-700'
          } ${className}`}
          {...props}
        />

        {clearable && hasValue && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Clear input"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        {!clearable && rightIcon && (
          <div className="pointer-events-none absolute right-3.5 flex items-center text-[var(--color-text-muted)] dark:text-slate-400">
            {rightIcon}
          </div>
        )}
      </div>

      {error ? (
        <p id={errorId} className="text-xs font-semibold text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-[var(--color-text-muted)] dark:text-slate-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
