import React from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, AlertCircle, Info } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export interface AttentionItem {
  id: string;
  title: string;
  type: 'warning' | 'danger' | 'info' | 'success';
  actionLabel?: string;
  onAction?: () => void;
}

export interface AttentionCardProps {
  title?: string;
  items: AttentionItem[];
  className?: string;
}

export const AttentionCard: React.FC<AttentionCardProps> = ({
  title = 'ATTENTION REQUIRED',
  items,
  className = '',
}) => {
  const iconMap = {
    warning: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />,
    danger: <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />,
    info: <Info className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />,
  };

  const badgeMap = {
    warning: 'warning' as const,
    danger: 'danger' as const,
    info: 'info' as const,
    success: 'success' as const,
  };

  return (
    <Card className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] dark:text-slate-400">
          {title}
        </h3>

        <Badge variant="warning" size="sm">
          {items.filter((i) => i.type !== 'success').length} Items
        </Badge>
      </div>

      <div className="divide-y divide-[var(--color-border)]/60 dark:divide-slate-800/60">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={item.onAction}
            className={`flex items-start justify-between gap-3 py-2.5 transition-colors ${
              item.onAction
                ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg px-2 -mx-2'
                : ''
            }`}
          >
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              {iconMap[item.type]}
              <span
                className={`text-xs sm:text-sm font-semibold truncate ${
                  item.type === 'success'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-[var(--color-text)] dark:text-slate-200'
                }`}
              >
                {item.title}
              </span>
            </div>

            {item.actionLabel && (
              <span className="shrink-0 flex items-center text-xs font-bold text-[var(--color-primary)] dark:text-sky-400">
                <span>{item.actionLabel}</span>
                <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
