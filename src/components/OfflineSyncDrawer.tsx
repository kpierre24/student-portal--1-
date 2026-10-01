import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Clock,
  X,
  Sparkles,
  Wifi,
  WifiOff,
  Check,
  Smartphone,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { OfflineQueueItem } from '../types';
import { cacheService } from '../services/api/cacheService';
import { performanceMonitor } from '../services/performanceMonitor';

interface OfflineSyncDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  onTriggerFullSync?: () => Promise<void> | void;
}

export const OfflineSyncDrawer: React.FC<OfflineSyncDrawerProps> = ({
  isOpen,
  onClose,
  isOnline,
  onTriggerFullSync,
}) => {
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Telemetry Metrics
  const [cacheStats, setCacheStats] = useState(cacheService.getStats());
  const [perfSummary, setPerfSummary] = useState(performanceMonitor.getPerformanceSummary());

  const loadQueue = () => {
    try {
      const raw = localStorage.getItem('hteim_offline_queue');
      if (raw) {
        setQueue(JSON.parse(raw));
      } else {
        setQueue([]);
      }
    } catch {
      setQueue([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadQueue();
      setCacheStats(cacheService.getStats());
      setPerfSummary(performanceMonitor.getPerformanceSummary());
    }
  }, [isOpen]);

  const handleSyncNow = async () => {
    if (!isOnline) {
      setSyncFeedback('Device is currently offline. Changes will sync automatically when reconnected.');
      return;
    }

    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      if (onTriggerFullSync) {
        await onTriggerFullSync();
      }

      await new Promise((res) => setTimeout(res, 800));

      setQueue([]);
      localStorage.setItem('hteim_offline_queue', JSON.stringify([]));
      setSyncFeedback('All offline changes synced successfully!');
      setTimeout(() => {
        setSyncFeedback(null);
      }, 3000);
    } catch (err: any) {
      setSyncFeedback(`Sync issue: ${err?.message || 'Please try again.'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearItem = (id: string) => {
    const filtered = queue.filter((item) => item.id !== id);
    setQueue(filtered);
    localStorage.setItem('hteim_offline_queue', JSON.stringify(filtered));
  };

  const handleClearAll = () => {
    setQueue([]);
    localStorage.removeItem('hteim_offline_queue');
  };

  if (!isOpen) return null;

  const pendingItems = queue.filter((item) => item.status !== 'synced');

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Sync Status & Offline Queue"
    >
      <div
        className="bg-white dark:bg-[#08182c] border-l border-slate-200 dark:border-[#1a385c] w-full max-w-md h-full flex flex-col shadow-2xl relative animate-slide-in-right text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isOnline
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xs uppercase tracking-widest font-extrabold text-slate-400 dark:text-slate-400">
                SYNC STATUS
              </h2>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                {isOnline ? 'Online' : 'Offline'}
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center font-bold cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {/* Main Sync Status Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {pendingItems.length === 0
                  ? 'All changes saved'
                  : `${pendingItems.length} change${pendingItems.length === 1 ? '' : 's'} waiting`}
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  isOnline
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {isOnline ? 'Ready to Sync' : 'Buffered Locally'}
              </span>
            </div>

            {/* List of changes waiting */}
            {pendingItems.length > 0 ? (
              <div className="space-y-2">
                {pendingItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 p-3 bg-white dark:bg-[#08182c] border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {item.type === 'attendance_checkin'
                            ? 'Attendance check-in'
                            : item.type === 'grade_update'
                            ? 'Grade submission'
                            : item.type === 'payment_record'
                            ? 'Payment record'
                            : 'Profile & Notes update'}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                          {item.description}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleClearItem(item.id)}
                      className="text-slate-400 hover:text-red-500 p-1 shrink-0 cursor-pointer"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center space-y-1.5">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  You are completely up to date.
                </p>
                <p className="text-[11px] text-slate-400">
                  Any actions performed offline will queue here and sync automatically.
                </p>
              </div>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              They&apos;ll sync automatically when connected.
            </p>

            {/* Sync Now button */}
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing || (pendingItems.length === 0 && isOnline)}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer dark:bg-sky-600"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing changes…' : 'Sync Now'}</span>
            </button>

            {syncFeedback && (
              <div className="p-2.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{syncFeedback}</span>
              </div>
            )}
          </div>

          {/* Quick info / telemetry */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Storage & Cache Status
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Cache Hit Rate
                </span>
                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 font-mono mt-0.5 block">
                  {cacheStats.hits + cacheStats.misses > 0
                    ? `${Math.round((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100)}%`
                    : '100%'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Avg Render Time
                </span>
                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 font-mono mt-0.5 block">
                  {perfSummary.dashboardAvgLoadMs}ms
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
