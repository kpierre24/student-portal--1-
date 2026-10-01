/**
 * High-Performance Data Caching Service for HTEIM School of Ministry Portal.
 * Features in-memory caching with LocalStorage persistence and TTL invalidation.
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
  etag?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keysCount: number;
  lastInvalidation?: string;
}

class PortalCacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = { hits: 0, misses: 0, keysCount: 0 };
  private STORAGE_PREFIX = 'hteim_portal_cache_';
  private DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 Minutes

  constructor() {
    this.hydrateFromStorage();
  }

  /**
   * Retrieve cached item if valid and within TTL window.
   */
  get<T>(key: string): T | null {
    const memoryItem = this.memoryCache.get(key);
    const now = Date.now();

    if (memoryItem) {
      if (now - memoryItem.timestamp < memoryItem.ttlMs) {
        this.stats.hits++;
        return memoryItem.data as T;
      }
      // Expired in memory
      this.memoryCache.delete(key);
      this.removeFromStorage(key);
    }

    // Secondary check in localStorage
    try {
      const storageKey = this.STORAGE_PREFIX + key;
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: CacheEntry<T> = JSON.parse(raw);
        if (now - parsed.timestamp < parsed.ttlMs) {
          // Restore to memory cache
          this.memoryCache.set(key, parsed);
          this.stats.hits++;
          return parsed.data;
        }
        localStorage.removeItem(storageKey);
      }
    } catch (e) {
      console.warn('[CacheService] Failed reading from storage:', e);
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Store data in memory and localStorage with TTL.
   */
  set<T>(key: string, data: T, ttlMs: number = this.DEFAULT_TTL_MS, etag?: string): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttlMs,
      etag
    };

    this.memoryCache.set(key, entry);
    this.stats.keysCount = this.memoryCache.size;

    try {
      const storageKey = this.STORAGE_PREFIX + key;
      localStorage.setItem(storageKey, JSON.stringify(entry));
    } catch (e) {
      console.warn('[CacheService] Storage quota exceeded or disabled:', e);
    }
  }

  /**
   * Invalidate specific key or matching pattern (e.g. 'students_*', 'attendance_*')
   */
  invalidate(pattern?: string | RegExp): void {
    this.stats.lastInvalidation = new Date().toLocaleTimeString();

    if (!pattern) {
      this.clear();
      return;
    }

    const keysToDelete: string[] = [];

    this.memoryCache.forEach((_, key) => {
      if (typeof pattern === 'string') {
        if (key.includes(pattern) || key.startsWith(pattern)) {
          keysToDelete.push(key);
        }
      } else if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(k => {
      this.memoryCache.delete(k);
      this.removeFromStorage(k);
    });

    // Also scan localStorage for orphaned prefix keys
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const lsKey = localStorage.key(i);
        if (lsKey && lsKey.startsWith(this.STORAGE_PREFIX)) {
          const rawKey = lsKey.replace(this.STORAGE_PREFIX, '');
          if (typeof pattern === 'string' ? (rawKey.includes(pattern) || rawKey.startsWith(pattern)) : pattern.test(rawKey)) {
            localStorage.removeItem(lsKey);
          }
        }
      }
    } catch (e) {
      console.warn('[CacheService] Error scanning storage during invalidation:', e);
    }

    this.stats.keysCount = this.memoryCache.size;
  }

  /**
   * Clear all portal cache entries.
   */
  clear(): void {
    this.memoryCache.clear();
    this.stats.keysCount = 0;

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.STORAGE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn('[CacheService] Error clearing storage cache:', e);
    }
  }

  /**
   * Get telemetry stats.
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      keysCount: this.memoryCache.size
    };
  }

  private removeFromStorage(key: string): void {
    try {
      localStorage.removeItem(this.STORAGE_PREFIX + key);
    } catch (e) {
      // Ignore storage errors
    }
  }

  private hydrateFromStorage(): void {
    const now = Date.now();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.STORAGE_PREFIX)) {
          const rawKey = k.replace(this.STORAGE_PREFIX, '');
          const val = localStorage.getItem(k);
          if (val) {
            const entry: CacheEntry<any> = JSON.parse(val);
            if (now - entry.timestamp < entry.ttlMs) {
              this.memoryCache.set(rawKey, entry);
            } else {
              localStorage.removeItem(k);
            }
          }
        }
      }
      this.stats.keysCount = this.memoryCache.size;
    } catch (e) {
      console.warn('[CacheService] Error hydrating cache:', e);
    }
  }
}

export const cacheService = new PortalCacheService();
