import React from 'react';

export const DashboardSkeleton: React.FC<{ label?: string }> = ({ label = 'Loading section...' }) => {
  return (
    <div className="w-full space-y-6 animate-pulse p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-800">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-300 dark:bg-slate-800 rounded-lg" />
          <div className="h-3 w-72 bg-slate-200 dark:bg-slate-800/60 rounded" />
        </div>
        <div className="h-9 w-28 bg-amber-500/20 rounded-xl" />
      </div>

      {/* Grid Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-white dark:bg-slate-800/80 rounded-xl p-4 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10" />
            </div>
            <div className="h-7 w-16 bg-slate-300 dark:bg-slate-700 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="h-64 w-full bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-6 space-y-4">
        <div className="h-5 w-36 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-40 w-full bg-slate-100 dark:bg-slate-900/50 rounded-lg" />
      </div>

      <div className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
        {label}
      </div>
    </div>
  );
};
