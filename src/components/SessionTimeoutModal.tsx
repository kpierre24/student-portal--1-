import React from 'react';
import { Clock, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onExtend: () => void;
  onLogout: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  remainingSeconds,
  onExtend,
  onLogout,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 animate-scaleUp">
        <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Session Expiring Soon
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Due to inactivity, your secure portal session will automatically log off in:
          </p>
        </div>

        <div className="inline-block px-5 py-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl">
          <span className="text-2xl font-mono font-black text-amber-600 dark:text-amber-400">
            {remainingSeconds}s
          </span>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Click &quot;Stay Logged In&quot; to keep working, or log off now to secure your workstation.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onLogout}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Off Now</span>
          </button>
          <button
            type="button"
            onClick={onExtend}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Stay Logged In</span>
          </button>
        </div>
      </div>
    </div>
  );
};
