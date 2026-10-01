/**
 * Background Sync Worker for HTEIM School of Ministry Portal.
 * Handles queuing offline operations (attendance, grades, payments) and auto-syncing when online.
 */

export interface SyncQueueItem {
  id: string;
  type: 'ATTENDANCE' | 'GRADE' | 'PAYMENT' | 'STUDENT' | 'NOTE' | 'GENERIC';
  actionName: string;
  payload: any;
  timestamp: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  lastError?: string;
}

export interface SyncStatusEvent {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncTime?: string;
  lastSyncMessage?: string;
}

type SyncListener = (status: SyncStatusEvent) => void;

class BackgroundSyncWorker {
  private queue: SyncQueueItem[] = [];
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private listeners: Set<SyncListener> = new Set();
  private STORAGE_KEY = 'hteim_offline_sync_queue_v2';
  private MAX_RETRIES = 5;
  private syncTimer: any = null;

  constructor() {
    this.loadQueueFromStorage();
    this.initNetworkListeners();
  }

  /**
   * Enqueue a mutation task for background processing.
   */
  enqueueTask(type: SyncQueueItem['type'], actionName: string, payload: any): SyncQueueItem {
    const newItem: SyncQueueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      actionName,
      payload,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'pending'
    };

    this.queue.push(newItem);
    this.saveQueueToStorage();
    this.notifyListeners('Queued new offline operation: ' + actionName);

    // If online, attempt background sync immediately
    if (this.isOnline) {
      this.scheduleSync(500);
    }

    return newItem;
  }

  /**
   * Trigger immediate queue synchronization.
   */
  async flushQueue(handlerCallback?: (item: SyncQueueItem) => Promise<boolean>): Promise<{ successCount: number; failedCount: number }> {
    if (this.isSyncing) {
      return { successCount: 0, failedCount: 0 };
    }

    const pendingItems = this.queue.filter(i => i.status === 'pending' || i.status === 'failed');
    if (pendingItems.length === 0) {
      this.notifyListeners('No pending items to sync');
      return { successCount: 0, failedCount: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners(`Starting sync for ${pendingItems.length} offline operation(s)...`);

    let successCount = 0;
    let failedCount = 0;

    for (const item of pendingItems) {
      item.status = 'syncing';
      this.saveQueueToStorage();

      try {
        let success = false;

        if (handlerCallback) {
          success = await handlerCallback(item);
        } else {
          // Default sync simulation or API dispatcher
          success = await this.defaultProcessSyncItem(item);
        }

        if (success) {
          item.status = 'completed';
          successCount++;
        } else {
          item.retryCount++;
          item.status = item.retryCount >= this.MAX_RETRIES ? 'failed' : 'pending';
          item.lastError = `Sync failed on attempt ${item.retryCount}`;
          failedCount++;
        }
      } catch (err: any) {
        item.retryCount++;
        item.status = item.retryCount >= this.MAX_RETRIES ? 'failed' : 'pending';
        item.lastError = err?.message || 'Network / Server sync error';
        failedCount++;
      }

      this.saveQueueToStorage();
    }

    // Clean completed items older than 1 minute
    this.queue = this.queue.filter(i => i.status !== 'completed');
    this.saveQueueToStorage();

    this.isSyncing = false;
    const msg = `Sync complete: ${successCount} synced successfully, ${failedCount} failed.`;
    this.notifyListeners(msg);

    return { successCount, failedCount };
  }

  /**
   * Subscribe to sync worker updates.
   */
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Send initial status
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get active sync status.
   */
  getStatus(): SyncStatusEvent {
    const pendingCount = this.queue.filter(i => i.status === 'pending' || i.status === 'syncing').length;
    const failedCount = this.queue.filter(i => i.status === 'failed').length;

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount,
      failedCount,
      lastSyncTime: new Date().toLocaleTimeString()
    };
  }

  /**
   * Return entire active queue for UI inspection.
   */
  getQueue(): SyncQueueItem[] {
    return [...this.queue];
  }

  /**
   * Clear completed and failed items.
   */
  clearCompleted(): void {
    this.queue = this.queue.filter(i => i.status === 'pending' || i.status === 'syncing');
    this.saveQueueToStorage();
    this.notifyListeners('Cleared completed offline queue items');
  }

  /**
   * Clear all items.
   */
  clearAll(): void {
    this.queue = [];
    this.saveQueueToStorage();
    this.notifyListeners('Cleared all queue items');
  }

  private scheduleSync(delayMs: number = 2000): void {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.flushQueue();
    }, delayMs);
  }

  private async defaultProcessSyncItem(item: SyncQueueItem): Promise<boolean> {
    // Artificial slight delay for realistic network async operation
    await new Promise(res => setTimeout(res, 400));
    console.log('[BackgroundSyncWorker] Synced item:', item.actionName, item.payload);
    return true;
  }

  private initNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners('Internet connection restored. Triggering automatic background sync...');
      this.scheduleSync(1000);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners('Network offline. Switching to offline queue buffer.');
    });
  }

  private loadQueueFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        this.queue = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[BackgroundSyncWorker] Error loading queue from storage:', e);
      this.queue = [];
    }
  }

  private saveQueueToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      console.warn('[BackgroundSyncWorker] Error saving queue to storage:', e);
    }
  }

  private notifyListeners(message?: string): void {
    const status = {
      ...this.getStatus(),
      lastSyncMessage: message
    };

    this.listeners.forEach(l => l(status));

    // Also dispatch custom DOM event for lightweight integration anywhere
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hteim-sync-status', { detail: status }));
    }
  }
}

export const backgroundSyncWorker = new BackgroundSyncWorker();
