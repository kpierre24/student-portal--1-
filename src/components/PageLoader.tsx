import React from 'react';
import { Loader2, GraduationCap } from 'lucide-react';

export interface PageLoaderProps {
  message?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ message = 'Loading module...' }) => {
  return (
    <div className="flex-1 w-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800/80 backdrop-blur-sm transition-all">
      <div className="relative flex items-center justify-center mb-4">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
          <GraduationCap className="w-7 h-7 text-amber-600 dark:text-amber-400 animate-pulse" />
        </div>
        <Loader2 className="w-20 h-20 text-amber-500/70 animate-spin absolute -inset-3" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wider uppercase">{message}</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">HTEIM School of Ministry Portal</p>
      </div>
    </div>
  );
};

export default PageLoader;
