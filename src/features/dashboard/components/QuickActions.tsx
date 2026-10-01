import React from 'react';
import { ActionCard } from '../../../components/ui/ActionCard';

export interface QuickActionItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: 'primary' | 'accent' | 'success' | 'warning' | 'info';
  badge?: string;
}

export interface QuickActionsProps {
  title?: string;
  actions: QuickActionItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  title = 'QUICK ACTIONS',
  actions,
  columns = 4,
  className = '',
}) => {
  const colClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[columns];

  return (
    <div className={`space-y-3 ${className}`}>
      {title && (
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] dark:text-slate-400">
          {title}
        </h3>
      )}

      <div className={`grid gap-3 ${colClasses}`}>
        {actions.map((act) => (
          <ActionCard
            key={act.id}
            title={act.label}
            description={act.description}
            icon={act.icon}
            onClick={act.onClick}
            tone={act.tone}
            badge={act.badge}
          />
        ))}
      </div>
    </div>
  );
};
