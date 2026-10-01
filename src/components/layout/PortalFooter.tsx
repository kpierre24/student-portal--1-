import React from 'react';
import { ShieldCheck, Cloud, HelpCircle, Settings, Lock } from 'lucide-react';

export interface PortalFooterProps {
  appUser: any;
  onOpenGuide: () => void;
  onOpenSettings: () => void;
}

export function PortalFooter({ appUser, onOpenGuide, onOpenSettings }: PortalFooterProps) {
  return (
    <footer id="portal-footer" className="mt-auto md:mt-8 mb-16 md:mb-0 px-3 sm:px-5 py-2.5 sm:py-2 border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3 text-[11px] text-slate-500 dark:text-slate-400 z-10 relative shrink-0 shadow-xs">
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" title="System Operational"></span>
          <p className="font-semibold text-slate-800 dark:text-slate-200">HTEIM School of Ministry</p>
        </div>
        <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>75% Attendance Policy Enforced</span>
        </div>
        <span className="hidden md:inline text-slate-300 dark:text-slate-700">•</span>
        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
          <Cloud className="w-3 h-3 text-indigo-500 shrink-0" />
          <span>Cloud & Offline PWA Active</span>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenGuide}
          className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors cursor-pointer flex items-center gap-1"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Guide</span>
        </button>
        <span className="text-slate-300 dark:text-slate-700">•</span>
        {appUser?.role === 'admin' ? (
          <button
            onClick={onOpenSettings}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors cursor-pointer flex items-center gap-1"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        ) : (
          <span className="text-slate-400 dark:text-slate-600 flex items-center gap-1 cursor-not-allowed text-[11px] font-medium" title="Settings can only be changed by Administrator">
            <Lock className="w-3 h-3 text-slate-400 dark:text-slate-600" />
            <span>Settings (Admin)</span>
          </span>
        )}
        <span className="text-slate-300 dark:text-slate-700">•</span>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">HTEIM © 2026 • v1.0.0</p>
      </div>
    </footer>
  );
}

export default PortalFooter;
