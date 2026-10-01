import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'pills' | 'underline' | 'segmented';
  fullWidth?: boolean;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'pills',
  fullWidth = false,
  className = '',
}) => {
  if (variant === 'segmented') {
    return (
      <div
        role="tablist"
        className={`inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 dark:bg-slate-900 dark:border-slate-800 ${
          fullWidth ? 'w-full' : ''
        } ${className}`}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={`flex-1 min-h-[38px] inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap disabled:opacity-40 ${
                isActive
                  ? 'bg-[var(--color-surface-elevated)] text-[var(--color-primary)] shadow-sm dark:bg-[#08182c] dark:text-sky-300'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:text-slate-400'
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'underline') {
    return (
      <div
        role="tablist"
        className={`flex border-b border-[var(--color-border)] overflow-x-auto no-scrollbar dark:border-slate-800 ${className}`}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap min-h-[44px] disabled:opacity-40 ${
                isActive
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)] dark:border-sky-400 dark:text-sky-300'
                  : 'border-transparent text-[var(--color-text-muted)] hover:border-slate-300 hover:text-[var(--color-text)] dark:text-slate-400 dark:hover:border-slate-700'
              } ${fullWidth ? 'flex-1 justify-center' : ''}`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default 'pills'
  return (
    <div
      role="tablist"
      className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap min-h-[40px] disabled:opacity-40 ${
              isActive
                ? 'bg-[var(--color-primary)] text-white shadow-xs dark:bg-[#026cb8]'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-slate-100 hover:text-[var(--color-text)] dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
            } ${fullWidth ? 'flex-1 justify-center' : ''}`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
