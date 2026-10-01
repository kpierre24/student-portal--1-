import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'interactive' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
  onClick,
  ...props
}: CardProps) {
  const variantClasses = {
    default:
      'border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] dark:bg-[#08182c] dark:border-slate-800',
    elevated:
      'border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-md text-[var(--color-text)] dark:bg-[#08182c] dark:border-slate-800/80',
    outlined:
      'border-2 border-[var(--color-border)] bg-transparent text-[var(--color-text)] dark:border-slate-800',
    interactive:
      'border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] cursor-pointer transition-all hover:border-[var(--color-primary)] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 dark:bg-[#08182c] dark:border-slate-800 dark:hover:border-sky-500',
    glass:
      'border border-white/30 bg-white/80 backdrop-blur-md text-[var(--color-text)] dark:bg-[#08182c]/80 dark:border-slate-700/50',
  };

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const isClickable = Boolean(onClick || variant === 'interactive');

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`rounded-2xl transition-all ${
        onClick && variant !== 'interactive'
          ? 'cursor-pointer hover:border-[var(--color-primary)] hover:shadow-sm'
          : ''
      } ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex flex-col space-y-1.5 pb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className = '',
  children,
  as: Component = 'h3',
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' }) {
  return (
    <Component
      className={`text-lg font-bold tracking-tight text-[var(--color-text)] dark:text-slate-100 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardDescription({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`text-sm text-[var(--color-text-muted)] dark:text-slate-400 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-center pt-4 border-t border-[var(--color-border)] dark:border-slate-800 ${className}`} {...props}>
      {children}
    </div>
  );
}
