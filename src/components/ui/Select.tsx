import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  options?: SelectOption[];
  children?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  helperText,
  error,
  leftIcon,
  options,
  id,
  className = '',
  disabled,
  children,
  ...props
}, ref) => {
  const generatedId = useId();
  const selectId = id || generatedId;
  const helperId = `${selectId}-helper`;
  const errorId = `${selectId}-error`;

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={selectId}
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

        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`w-full appearance-none rounded-xl border bg-[var(--color-surface-elevated)] px-3.5 py-2.5 pr-10 text-sm text-[var(--color-text)] transition-all min-h-[44px] focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900/90 dark:text-slate-100 ${
            leftIcon ? 'pl-10' : ''
          } ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500'
              : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20 dark:border-slate-700'
          } ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <div className="pointer-events-none absolute right-3.5 flex items-center text-[var(--color-text-muted)] dark:text-slate-400">
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </div>
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

Select.displayName = 'Select';
