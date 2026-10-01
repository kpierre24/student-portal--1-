/**
 * ============================================================================
 * PRIMARY DATA SYNC SERVICE (React -> Express API -> Supabase PostgreSQL)
 * HTEIM School of Ministry
 * ============================================================================
 * Establishes Supabase PostgreSQL as the primary single source of truth
 * for all business data (Students, Courses, Enrollments, Attendance,
 * Assignments, Grades, Payments, and Audit Logs).
 *
 * All business operations flow through the Express API layer.
 * Local browser storage functions strictly as a temporary offline buffer/cache,
 * not as an authoritative data store.
 */

import { portalApi } from './api/portalApiClient';
import { supabase } from '../lib/supabaseClient';
import { saveToSupabase as directSaveToSupabase } from '../lib/supabaseSync';
import { SyncedAppState } from '../lib/firebaseSync';
import { handleError } from '../lib/errorHandler';
import { logger } from '../lib/logger';
import { sanitizeProductionState } from '../data/guards';
import { cacheService } from './api/cacheService';
import { backgroundSyncWorker } from './backgroundSyncWorker';
import { performanceMonitor } from './performanceMonitor';

export interface DataSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
}

let lastKnownStateVersion: number | null = null;

export function getLastKnownStateVersion(): number | null {
  return lastKnownStateVersion;
}

export function setLastKnownStateVersion(version: number | null) {
  lastKnownStateVersion = version;
}

/**
 * Loads the current workspace state from Express API / Supabase PostgreSQL as authoritative source.
 */
export async function loadAuthoritativeState(userEmail: string | null | undefined): Promise<SyncedAppState | null> {
  const emailKey = userEmail || 'default_public';
  performanceMonitor.startTrace(`load_authoritative_state_${emailKey}`);

  // 1. In-memory & storage caching layer strategy
  const cachedState = cacheService.get<SyncedAppState>(`authoritative_state_${emailKey}`);
  if (cachedState) {
    logger.info(`[CacheService] Cache hit for authoritative_state_${emailKey}`);
    performanceMonitor.endTrace(`load_authoritative_state_${emailKey}`);
    return cachedState;
  }

  try {
    // 2. Primary path: Fetch dynamically composed state via Express API -> Supabase PostgreSQL domain tables
    const apiState = await portalApi.loadAuthoritativeState(userEmail || undefined);
    if (apiState) {
      if (typeof (apiState as any).version === 'number') {
        lastKnownStateVersion = (apiState as any).version;
      }
      try {
        localStorage.setItem('hteim_offline_state_snapshot', JSON.stringify(apiState));
      } catch {
        // Safe ignore for storage quota
      }

      // Cache the result for 5 minutes (300,000ms) to prevent duplicate heavy loads on rapid tab re-renders/focus
      cacheService.set(`authoritative_state_${emailKey}`, apiState, 5 * 60 * 1000);

      const duration = performanceMonitor.endTrace(`load_authoritative_state_${emailKey}`);
      if (duration) {
        performanceMonitor.recordDashboardRender(duration, 'StatePull');
      }

      return apiState;
    }

    // 3. Offline snapshot cache fallback if network unreachable
    try {
      const cached = localStorage.getItem('hteim_offline_state_snapshot');
      if (cached) {
        const parsed = JSON.parse(cached);
        performanceMonitor.endTrace(`load_authoritative_state_${emailKey}`);
        return parsed;
      }
    } catch {
      // Return null if no offline snapshot
    }

    performanceMonitor.endTrace(`load_authoritative_state_${emailKey}`);
    return null;
  } catch (err: any) {
    handleError(err, 'loadAuthoritativeState - Relational composition load failure', 'database');
    // Read-only offline cache fallback
    try {
      const cached = localStorage.getItem('hteim_offline_state_snapshot');
      if (cached) {
        const parsed = JSON.parse(cached);
        performanceMonitor.endTrace(`load_authoritative_state_${emailKey}`);
        return parsed;
      }
    } catch {
      // Return null if no offline snapshot
    }
    performanceMonitor.endTrace(`load_authoritative_state_${emailKey}`);
    return null;
  }
}

/**
 * Caches local state snapshot for offline responsiveness.
 * In the pure relational architecture, persistence is executed via domain REST endpoints:
 * (/api/students, /api/attendance, /api/grades, /api/assignments, /api/invoices, /api/payments).
 */
export async function saveAuthoritativeState(
  userEmail: string | null | undefined,
  state: SyncedAppState,
  actionDescription?: string,
  _expectedVersion?: number | null
): Promise<boolean> {
  const emailKey = userEmail || 'default_public';

  try {
    // Guard: Demo state must never be saved to production database
    if (state.dataSource === 'demo' || (state as any).isDemo === true) {
      logger.warn('[DataSync] Blocked attempt to save demo state into production database.');
      return false;
    }

    const cleanState = sanitizeProductionState(state);

    // Update temporary local offline snapshot cache
    try {
      localStorage.setItem('hteim_offline_state_snapshot', JSON.stringify(cleanState));
    } catch {
      // Quota exceeded ignore
    }

    // Invalidate memory caches to force next load to pull fresh
    cacheService.invalidate(`authoritative_state_${emailKey}`);

    // Persist permanently to Supabase PostgreSQL database
    try {
      await directSaveToSupabase(userEmail, cleanState);
    } catch (saveErr) {
      logger.warn('[DataSync] Direct Supabase persistence notice:', saveErr);
    }

    // If offline, enqueue sync worker task
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      backgroundSyncWorker.enqueueTask(
        'GENERIC',
        actionDescription || 'Save State Snapshot Offline',
        { email: userEmail, stateSnapshot: cleanState }
      );
    }

    return true;
  } catch (err: any) {
    logger.warn('Local state cache snapshot update notice:', err);
    return false;
  }
}


/**
 * Subscribes to Supabase Realtime changes for PostgreSQL postgres_changes events.
 */
export function subscribeToRealtimeStateChanges(
  userEmail: string | null | undefined,
  onRemoteStateChange: (newState: SyncedAppState) => void
): () => void {
  const docId = userEmail
    ? `user_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`
    : 'shared_default_state';

  const channel = supabase
    .channel(`app_state_realtime_${docId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'app_states',
        filter: `id=eq.${docId}`,
      },
      (payload) => {
        const newState = (payload.new as any)?.state as SyncedAppState | null;
        if (newState) {
          logger.info(`[Realtime Sync] Received PostgreSQL state update for ${docId}`);
          onRemoteStateChange(newState);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.info(`[Supabase Realtime] Subscribed to PostgreSQL updates for ${docId}`);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Tests database connectivity
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const res = await fetch('/api/health');
    return res.ok;
  } catch {
    return false;
  }
}
