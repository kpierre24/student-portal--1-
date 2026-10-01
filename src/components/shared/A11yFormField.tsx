import React, { useId } from 'react';

export interface A11yFormFieldProps {
  label: string;
  name?: string;
  type?: 'text' | 'number' | 'email' | 'tel' | 'password' | 'date' | 'time' | 'search' | 'url';
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
  autoComplete?: string;
  disabled?: boolean;
  rows?: number;
  isTextArea?: boolean;
  isSelect?: boolean;
  options?: { value: string; label: string }[];
  className?: string;
  icon?: React.ReactNode;
}

export const A11yFormField: React.FC<A11yFormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  hint,
  inputMode,
  autoComplete,
  disabled = false,
  rows = 3,
  isTextArea = false,
  isSelect = false,
  options = [],
  className = '',
  icon
}) => {
  const generatedId = useId();
  const fieldId = name ? `field-${name}` : generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  const describedByIDs = [
    error ? errorId : null,
    hint ? hintId : null
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      <label 
        htmlFor={fieldId} 
        className="block text-xs font-bold text-slate-700 dark:text-slate-200"
      >
        {label}
        {required && <span className="text-rose-500 ml-0.5" aria-hidden="true">*</span>}
      </label>

      <div className="relative rounded-xl">
        {icon && (
          <div className="absolute left-3 top-3.5 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}

        {isTextArea ? (
          <textarea
            id={fieldId}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            rows={rows}
            aria-invalid={!!error}
            aria-describedby={describedByIDs}
            className={`w-full ${icon ? 'pl-9' : 'px-3.5'} py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-sm font-medium transition-all text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
              error 
                ? 'border-rose-500 focus:ring-rose-500/30' 
                : 'border-slate-300 dark:border-slate-700 focus:ring-purple-600 focus:border-purple-600'
            }`}
          />
        ) : isSelect ? (
          <select
            id={fieldId}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedByIDs}
            className={`w-full min-h-[48px] ${icon ? 'pl-9' : 'px-3.5'} py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-sm font-medium transition-all text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
              error 
                ? 'border-rose-500 focus:ring-rose-500/30' 
                : 'border-slate-300 dark:border-slate-700 focus:ring-purple-600 focus:border-purple-600'
            }`}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={fieldId}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            inputMode={inputMode}
            autoComplete={autoComplete}
            aria-invalid={!!error}
            aria-describedby={describedByIDs}
            className={`w-full min-h-[48px] ${icon ? 'pl-9' : 'px-3.5'} py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-sm font-medium transition-all text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
              error 
                ? 'border-rose-500 focus:ring-rose-500/30' 
                : 'border-slate-300 dark:border-slate-700 focus:ring-purple-600 focus:border-purple-600'
            }`}
          />
        )}
      </div>

      {/* Hint Text */}
      {hint && !error && (
        <p id={hintId} className="text-[11px] text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}

      {/* Error Announcement */}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
