/**
 * ============================================================================
 * SAFE LOCAL STORAGE & QUOTA DEFENSE ENGINE
 * HTEIM School of Ministry
 * ============================================================================
 * Protects the entire application against browser Storage quota exhaustion
 * (QuotaExceededError), private browsing storage restrictions, and high-frequency writes.
 * 
 * Provides:
 * 1. Global prototype interception for `Storage.prototype.setItem` so all
 *    direct `localStorage.setItem` calls never crash React render or effects.
 * 2. Automated opportunistic cache eviction of disposable entries (Bible chapter caches,
 *    API response caches, offline state snapshots).
 * 3. In-memory fallback layer for active session durability when local disk is full.
 */

import { logger } from './logger';

// In-memory fallback dictionary for when quota is exceeded or storage is unavailable
const memoryFallbackStore = new Map<string, string>();

// Dispensable prefixes and keys that can be safely evicted when storage is tight
const DISPENSABLE_PATTERNS = [
  'hteim_cache_',
  'hteim_bible_ch_',
  'portal_cache_',
  'api_cache_',
  'hteim_offline_state_snapshot',
  '_test_diag_',
];

/**
 * Checks if a key is dispensable and safe to purge during quota emergencies
 */
function isDispensableKey(key: string): boolean {
  return DISPENSABLE_PATTERNS.some((pattern) => key.startsWith(pattern) || key.includes(pattern));
}

/**
 * Attempts to free storage space by removing dispensable caches
 */
export function purgeDispensableStorage(storageInstance?: Storage): number {
  const targetStorage = storageInstance || (typeof window !== 'undefined' ? window.localStorage : null);
  if (!targetStorage) return 0;

  let purgedCount = 0;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < targetStorage.length; i++) {
      const key = targetStorage.key(i);
      if (key && isDispensableKey(key)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      try {
        targetStorage.removeItem(key);
        purgedCount++;
      } catch {
        // Ignore single item removal errors
      }
    }

    // If still having high memory pressure and no dispensable keys found, find any bloated keys (>250KB)
    if (purgedCount === 0) {
      const oversizedKeys: { key: string; len: number }[] = [];
      for (let i = 0; i < targetStorage.length; i++) {
        const key = targetStorage.key(i);
        if (
          key &&
          !key.includes('auth') &&
          !key.includes('token') &&
          !key.includes('user') &&
          !key.includes('active_cohort')
        ) {
          const val = targetStorage.getItem(key);
          if (val && val.length > 250000) {
            oversizedKeys.push({ key, len: val.length });
          }
        }
      }
      // Sort descending by size and remove up to 3 largest non-critical caches
      oversizedKeys.sort((a, b) => b.len - a.len);
      for (let j = 0; j < Math.min(oversizedKeys.length, 3); j++) {
        try {
          targetStorage.removeItem(oversizedKeys[j].key);
          purgedCount++;
        } catch {}
      }
    }
  } catch (err) {
    logger.warn('[safeStorage] Failed during emergency storage purge:', err);
  }

  return purgedCount;
}

/**
 * Checks if an error is a browser QuotaExceededError across all browser engines
 */
export function isQuotaExceededError(err: any): boolean {
  if (!err) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014 ||
    err.number === -2147024882 ||
    (typeof err.message === 'string' &&
      (err.message.toLowerCase().includes('quota') ||
        err.message.toLowerCase().includes('storage full') ||
        err.message.toLowerCase().includes('exceeded the quota')))
  );
}

let isPatched = false;

/**
 * Patches global `Storage.prototype` so that any caller writing to localStorage or
 * sessionStorage is protected against crashes from QuotaExceededError.
 */
export function initSafeStorage() {
  if (typeof window === 'undefined' || typeof Storage === 'undefined' || isPatched) {
    return;
  }

  isPatched = true;

  const originalSetItem = Storage.prototype.setItem;
  const originalGetItem = Storage.prototype.getItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  const originalClear = Storage.prototype.clear;

  Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
    try {
      originalSetItem.call(this, key, value);
      // Remove from memory fallback if it successfully wrote to persistent storage
      memoryFallbackStore.delete(key);
    } catch (err: any) {
      if (isQuotaExceededError(err)) {
        logger.warn(`[safeStorage] Storage quota reached while saving "${key}". Evicting disposable cache...`);
        const freed = purgeDispensableStorage(this);
        if (freed > 0) {
          try {
            originalSetItem.call(this, key, value);
            memoryFallbackStore.delete(key);
            return;
          } catch (retryErr) {
            // Still full even after eviction, fall through to memory fallback
          }
        }

        // Keep value safely in memory so the running app session continues without loss
        memoryFallbackStore.set(key, value);
        logger.warn(`[safeStorage] Persisted key "${key}" to in-memory session buffer to prevent app crash.`);
        return;
      }

      // Any other storage error (e.g., SecurityError in restricted iframes)
      logger.warn(`[safeStorage] Storage setItem failed for key "${key}":`, err);
      memoryFallbackStore.set(key, value);
    }
  };

  Storage.prototype.getItem = function (this: Storage, key: string): string | null {
    try {
      const val = originalGetItem.call(this, key);
      if (val !== null) return val;
      return memoryFallbackStore.get(key) ?? null;
    } catch {
      return memoryFallbackStore.get(key) ?? null;
    }
  };

  Storage.prototype.removeItem = function (this: Storage, key: string) {
    memoryFallbackStore.delete(key);
    try {
      originalRemoveItem.call(this, key);
    } catch {
      // Ignore
    }
  };

  Storage.prototype.clear = function (this: Storage) {
    memoryFallbackStore.clear();
    try {
      originalClear.call(this);
    } catch {
      // Ignore
    }
  };
}

// Automatically invoke on module evaluation in browser environments
if (typeof window !== 'undefined') {
  initSafeStorage();
}

/**
 * Convenient explicit API for storage operations
 */
export const safeStorage = {
  getItem(key: string, defaultValue: string | null = null): string | null {
    try {
      if (typeof window === 'undefined') return defaultValue;
      const item = window.localStorage.getItem(key);
      return item !== null ? item : defaultValue;
    } catch {
      return memoryFallbackStore.get(key) ?? defaultValue;
    }
  },

  getJSON<T>(key: string, defaultValue: T): T {
    try {
      const raw = this.getItem(key);
      if (!raw) return defaultValue;
      return JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  },

  setItem(key: string, value: string): boolean {
    try {
      if (typeof window === 'undefined') {
        memoryFallbackStore.set(key, value);
        return true;
      }
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      memoryFallbackStore.set(key, value);
      return false;
    }
  },

  setJSON(key: string, value: any): boolean {
    try {
      return this.setItem(key, JSON.stringify(value));
    } catch {
      return false;
    }
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
    memoryFallbackStore.delete(key);
  },

  purgeDispensable(): number {
    return purgeDispensableStorage();
  },
};
