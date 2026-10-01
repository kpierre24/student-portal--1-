import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';

export interface PWAUpdateNotificationProps {
  onUpdate?: () => void;
  className?: string;
}

export const PWAUpdateNotification: React.FC<PWAUpdateNotificationProps> = ({
  onUpdate,
  className = '',
}) => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Listen for custom swUpdate or service worker updatefound events
    const handleSWUpdate = () => {
      setShowUpdate(true);
    };

    window.addEventListener('swUpdateAvailable', handleSWUpdate);

    // Also check service worker registration if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          reg.addEventListener('updatefound', () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (
                  installingWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  setShowUpdate(true);
                }
              });
            }
          });
        }
      });
    }

    return () => {
      window.removeEventListener('swUpdateAvailable', handleSWUpdate);
    };
  }, []);

  const handleUpdateNow = () => {
    setIsUpdating(true);
    if (onUpdate) {
      onUpdate();
    } else {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      }
      setTimeout(() => {
        window.location.reload();
      }, 300);
    }
  };

  if (!showUpdate) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4.5 text-slate-900 dark:text-slate-100 animate-fade-slide-up ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            New version available
          </h4>
        </div>
        <button
          type="button"
          onClick={() => setShowUpdate(false)}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          aria-label="Dismiss update"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-10.5">
        We&apos;ve improved the app with faster syncing and performance enhancements.
      </p>

      <div className="mt-3.5 flex items-center justify-end gap-2 pl-10.5">
        <button
          type="button"
          onClick={() => setShowUpdate(false)}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Later
        </button>
        <button
          type="button"
          onClick={handleUpdateNow}
          disabled={isUpdating}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--color-primary)] hover:opacity-90 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer dark:bg-sky-600"
        >
          {isUpdating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
          <span>{isUpdating ? 'Updating…' : 'Update now'}</span>
        </button>
      </div>
    </div>
  );
};
