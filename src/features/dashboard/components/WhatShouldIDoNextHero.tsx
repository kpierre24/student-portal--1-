import React from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  BookOpen, 
  Calendar, 
  UserCheck, 
  DollarSign, 
  Users 
} from 'lucide-react';
import { TabType } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

export interface ActionHeroItem {
  id: string;
  badgeText: string;
  badgeVariant?: 'danger' | 'warning' | 'info' | 'success' | 'primary';
  questionPrompt?: string; // e.g. "What should I do next?"
  title: string;
  subtitle: string;
  timeContext?: string;
  actionLabel: string;
  actionTab: TabType;
  secondaryActions?: { label: string; tab: TabType }[];
}

export interface WhatShouldIDoNextHeroProps {
  item: ActionHeroItem;
  role: 'student' | 'teacher' | 'admin';
  onNavigate?: (tab: TabType) => void;
  className?: string;
}

export const WhatShouldIDoNextHero: React.FC<WhatShouldIDoNextHeroProps> = ({
  item,
  role,
  onNavigate,
  className = '',
}) => {
  const getBadgeStyle = (variant: ActionHeroItem['badgeVariant'] = 'primary') => {
    switch (variant) {
      case 'danger':
        return 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30';
      case 'warning':
        return 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30';
      case 'success':
        return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30';
      case 'info':
        return 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30';
      default:
        return 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] dark:text-sky-300 border-[var(--color-primary)]/30';
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 border-[var(--color-primary)]/25 bg-gradient-to-br from-white via-slate-50 to-indigo-50/40 p-4 sm:p-6 shadow-md dark:border-sky-500/30 dark:from-[#08182c] dark:via-[#0c223c] dark:to-[#040e1b] ${className}`}
    >
      {/* Decorative subtle background accents */}
      <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[var(--color-primary)]/10 blur-2xl pointer-events-none dark:bg-sky-500/10" />
      <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-[var(--color-accent)]/10 blur-xl pointer-events-none dark:bg-indigo-500/10" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left Side: Answer the question */}
        <div className="space-y-2 max-w-2xl min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-[var(--color-primary)] dark:text-sky-400">
              <Sparkles className="h-3.5 w-3.5" />
              {item.questionPrompt || 'WHAT SHOULD I DO NEXT?'}
            </span>

            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${getBadgeStyle(
                item.badgeVariant
              )}`}
            >
              {item.badgeText}
            </span>

            {item.timeContext && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <Clock className="h-3 w-3" />
                {item.timeContext}
              </span>
            )}
          </div>

          <h2 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate">
            {item.title}
          </h2>

          <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 line-clamp-2">
            {item.subtitle}
          </p>

          {/* Secondary Action quick chips */}
          {item.secondaryActions && item.secondaryActions.length > 0 && (
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Then:
              </span>
              {item.secondaryActions.map((sec, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onNavigate?.(sec.tab)}
                  className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-[var(--color-primary)] dark:hover:text-sky-300 underline underline-offset-2 transition-colors cursor-pointer"
                >
                  {sec.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Primary High-Visibility Action CTA */}
        <div className="shrink-0 flex items-center gap-3">
          <Button
            size="lg"
            variant="primary"
            onClick={() => onNavigate?.(item.actionTab)}
            className="w-full sm:w-auto font-black shadow-lg hover:shadow-xl active:scale-95 transition-all text-sm py-3 px-6 rounded-xl flex items-center justify-center gap-2 bg-gradient-to-r from-[#023264] to-[#025798] dark:from-sky-600 dark:to-indigo-600 text-white"
          >
            <span>{item.actionLabel}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
