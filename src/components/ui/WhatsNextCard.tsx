import React from 'react';
import { 
  FileText, 
  BookOpen, 
  DollarSign, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  GraduationCap
} from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';

export type WhatsNextType = 'quiz' | 'assignment' | 'material' | 'payment' | 'announcement' | 'attendance' | 'general';
export type WhatsNextPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface WhatsNextCardProps {
  title: string;
  description: string;
  dueDate?: string;
  actionLabel?: string;
  onAction?: () => void;
  priority?: WhatsNextPriority;
  type?: WhatsNextType;
  icon?: React.ReactNode;
  completed?: boolean;
  badgeText?: string;
  className?: string;
}

export const WhatsNextCard: React.FC<WhatsNextCardProps> = ({
  title,
  description,
  dueDate,
  actionLabel = 'View',
  onAction,
  priority = 'medium',
  type = 'general',
  icon,
  completed = false,
  badgeText,
  className = '',
}) => {
  const defaultIcons: Record<WhatsNextType, React.ReactNode> = {
    quiz: <FileText className="h-5 w-5" />,
    assignment: <GraduationCap className="h-5 w-5" />,
    material: <BookOpen className="h-5 w-5" />,
    payment: <DollarSign className="h-5 w-5" />,
    announcement: <AlertCircle className="h-5 w-5" />,
    attendance: <CheckCircle2 className="h-5 w-5" />,
    general: <Clock className="h-5 w-5" />,
  };

  const priorityStyles: Record<
    WhatsNextPriority,
    { badgeVariant: 'danger' | 'warning' | 'info' | 'neutral'; borderAccent: string }
  > = {
    urgent: {
      badgeVariant: 'danger',
      borderAccent: 'border-l-4 border-l-red-500 dark:border-l-red-400',
    },
    high: {
      badgeVariant: 'warning',
      borderAccent: 'border-l-4 border-l-amber-500 dark:border-l-amber-400',
    },
    medium: {
      badgeVariant: 'info',
      borderAccent: 'border-l-4 border-l-[var(--color-primary)] dark:border-l-sky-400',
    },
    low: {
      badgeVariant: 'neutral',
      borderAccent: 'border-l-4 border-l-slate-300 dark:border-l-slate-600',
    },
  };

  const style = priorityStyles[priority];

  return (
    <Card
      variant="default"
      className={`relative overflow-hidden transition-all hover:shadow-md ${style.borderAccent} ${
        completed ? 'opacity-70 bg-slate-50 dark:bg-slate-900/40' : ''
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left icon & text details */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs ${
              completed
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-[var(--md-primary-container)] text-[var(--color-primary)] dark:bg-sky-950/60 dark:text-sky-300'
            }`}
            aria-hidden="true"
          >
            {completed ? <CheckCircle2 className="h-5 w-5" /> : icon || defaultIcons[type]}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-bold text-[var(--color-text)] dark:text-slate-100 truncate">
                {title}
              </h4>
              {badgeText ? (
                <Badge variant={style.badgeVariant} size="sm">
                  {badgeText}
                </Badge>
              ) : priority === 'urgent' || priority === 'high' ? (
                <Badge variant={style.badgeVariant} size="sm">
                  {priority === 'urgent' ? 'Urgent' : 'Priority'}
                </Badge>
              ) : null}
            </div>

            <p className="mt-0.5 text-xs sm:text-sm text-[var(--color-text-muted)] dark:text-slate-400 line-clamp-1">
              {description}
            </p>

            {dueDate && (
              <div className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{dueDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        {onAction && (
          <div className="shrink-0 flex items-center justify-end pt-2 sm:pt-0">
            <Button
              size="sm"
              variant={priority === 'urgent' ? 'danger' : 'primary'}
              onClick={onAction}
              rightIcon={<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
              className="w-full sm:w-auto"
            >
              {actionLabel}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
