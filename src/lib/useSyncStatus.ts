import { useState, useEffect, useCallback } from 'react';
import { OfflineQueueItem } from '../types';

export interface SyncStatus {
  isOnline: boolean;
  queue: OfflineQueueItem[];
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncNow: () => Promise<void>;
  addQueueItem: (item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'status' | 'retryCount'>) => void;
  clearQueue: () => void;
  statusLabel: string;
}

const QUEUE_STORAGE_KEY = 'hteim_offline_queue';
const LAST_SYNC_KEY = 'hteim_last_synced_time';

export function useSyncStatus(onTriggerFullSync?: () => Promise<void> | void): SyncStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queue, setQueue] = useState<OfflineQueueItem[]>(() => {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => {
    try {
      const raw = localStorage.getItem(LAST_SYNC_KEY);
      return raw ? new Date(raw) : new Date();
    } catch {
      return new Date();
    }
  });

  const refreshQueue = useCallback(() => {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      setQueue(raw ? JSON.parse(raw) : []);
    } catch {
      setQueue([]);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      refreshQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      refreshQueue();
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === QUEUE_STORAGE_KEY) {
        refreshQueue();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshQueue]);

  const addQueueItem = useCallback(
    (item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'status' | 'retryCount'>) => {
      const newItem: OfflineQueueItem = {
        ...item,
        id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        status: 'pending',
        retryCount: 0,
      };

      try {
        const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
        const currentQueue: OfflineQueueItem[] = raw ? JSON.parse(raw) : [];
        const updated = [newItem, ...currentQueue];
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updated));
        setQueue(updated);
      } catch (err) {
        console.error('Failed to store offline queue item:', err);
      }
    },
    []
  );

  const clearQueue = useCallback(() => {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify([]));
      setQueue([]);
    } catch (err) {
      console.error('Failed to clear queue:', err);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!isOnline) {
      return;
    }

    setIsSyncing(true);
    try {
      if (onTriggerFullSync) {
        await onTriggerFullSync();
      }
      // Simulate/wait for buffer flush
      await new Promise((res) => setTimeout(res, 800));

      const now = new Date();
      setLastSyncedAt(now);
      localStorage.setItem(LAST_SYNC_KEY, now.toISOString());
      clearQueue();
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, onTriggerFullSync, clearQueue]);

  const pendingCount = queue.filter((q) => q.status === 'pending').length;

  let statusLabel = '☁ ✓';
  if (!isOnline) {
    statusLabel = '☁ Offline';
  } else if (isSyncing) {
    statusLabel = '☁ Syncing…';
  } else if (pendingCount > 0) {
    statusLabel = `☁ ${pendingCount} pending`;
  }

  return {
    isOnline,
    queue,
    pendingCount,
    isSyncing,
    lastSyncedAt,
    syncNow,
    addQueueItem,
    clearQueue,
    statusLabel,
  };
}
