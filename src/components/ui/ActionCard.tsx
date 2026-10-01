import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';

export interface ActionCardProps {
  title: string;
  description?: string;
  icon: React.ReactNode | React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  action?: string | React.ReactNode;
  badge?: string;
  tone?: 'primary' | 'accent' | 'success' | 'warning' | 'info';
  disabled?: boolean;
  rightElement?: React.ReactNode;
  className?: string;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  icon,
  onClick,
  action,
  badge,
  tone = 'primary',
  disabled = false,
  rightElement,
  className = '',
}) => {
  const toneClasses = {
    primary:
      'bg-[var(--md-primary-container)] text-[var(--color-primary)] dark:bg-sky-950/60 dark:text-sky-300',
    accent:
      'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300',
    success:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    warning:
      'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300',
    info:
      'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  };

  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === 'function') {
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      return <IconComponent className="h-6 w-6" />;
    }
    return icon;
  };

  const renderAction = () => {
    if (rightElement) return rightElement;
    if (typeof action === 'string') {
      return (
        <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[var(--color-primary)] bg-[var(--md-primary-container)] px-3 py-1.5 rounded-lg group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors dark:bg-sky-950/70 dark:text-sky-300">
          <span>{action}</span>
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </span>
      );
    }
    if (action) return action;
    return <ChevronRight className="h-5 w-5" aria-hidden="true" />;
  };

  return (
    <Card
      onClick={disabled ? undefined : onClick}
      variant="interactive"
      className={`group relative flex items-center justify-between gap-4 p-4 sm:p-5 transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform group-hover:scale-105 ${toneClasses[tone]}`}
          aria-hidden="true"
        >
          {renderIcon()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-bold text-[var(--color-text)] dark:text-slate-100 truncate group-hover:text-[var(--color-primary)] dark:group-hover:text-sky-300 transition-colors">
              {title}
            </h4>
            {badge && (
              <Badge variant="accent" size="sm">
                {badge}
              </Badge>
            )}
          </div>

          {description && (
            <p className="mt-0.5 text-xs sm:text-sm text-[var(--color-text-muted)] dark:text-slate-400 line-clamp-1">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] group-hover:translate-x-0.5 transition-all dark:text-slate-400 dark:group-hover:text-sky-300">
        {renderAction()}
      </div>
    </Card>
  );
};
