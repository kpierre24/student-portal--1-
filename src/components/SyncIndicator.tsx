import React from 'react';
import { Cloud, CloudOff, RefreshCw, Check } from 'lucide-react';

export interface SyncIndicatorProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  onClick?: () => void;
  className?: string;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  isOnline,
  isSyncing,
  pendingCount,
  onClick,
  className = '',
}) => {
  let content: React.ReactNode;
  let toneClass = 'text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-800';
  let title = 'System is online and synchronized';

  if (!isOnline) {
    toneClass = 'text-amber-700 bg-amber-100 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800';
    title = 'Working offline — click to view sync status';
    content = (
      <>
        <CloudOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="font-bold text-[11px]">Offline</span>
        {pendingCount > 0 && (
          <span className="bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
            {pendingCount}
          </span>
        )}
      </>
    );
  } else if (isSyncing) {
    toneClass = 'text-blue-700 bg-blue-100 border border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800';
    title = 'Synchronizing changes with cloud…';
    content = (
      <>
        <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
        <span className="font-bold text-[11px]">Syncing…</span>
      </>
    );
  } else if (pendingCount > 0) {
    toneClass = 'text-indigo-700 bg-indigo-100 border border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800';
    title = `${pendingCount} changes waiting to sync`;
    content = (
      <>
        <Cloud className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span className="font-bold text-[11px]">{pendingCount} pending</span>
      </>
    );
  } else {
    toneClass = 'text-emerald-700 bg-emerald-50 border border-emerald-200/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/80';
    title = 'All changes saved & synced';
    content = (
      <>
        <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 -ml-1.5 shrink-0" />
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-2xs shrink-0 select-none ${toneClass} ${className}`}
      title={title}
      aria-label={title}
    >
      {content}
    </button>
  );
};
