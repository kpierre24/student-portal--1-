import { supabase } from './supabaseClient';
import { SyncedAppState } from '../types/appState';
import { logger } from './logger';
import { sanitizeProductionState } from '../data/guards';

export type { SyncedAppState };

export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('app_states').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        logger.warn("app_states table does not exist in Supabase yet.");
        return false;
      }
      return false;
    }
    return true;
  } catch (err) {
    logger.warn("Supabase connection unavailable:", err);
    return false;
  }
}

export async function loadFromSupabase(userEmail: string | null | undefined): Promise<SyncedAppState | null> {
  try {
    const docId = userEmail 
      ? `user_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}` 
      : 'shared_default_state';

    const { data, error } = await supabase
      .from('app_states')
      .select('state, version')
      .eq('id', docId)
      .single();

    if (error) {
      if (error.code === '42P01') {
        throw new Error('TABLE_NOT_FOUND');
      }
    }

    if (data?.state) {
      const stateObj = data.state;
      stateObj.version = Number(data.version) || Number(stateObj.version) || 1;
      return stateObj;
    }

    // Fall back to shared_default_state if user-specific record was not found
    if (docId !== 'shared_default_state') {
      const fallback = await supabase
        .from('app_states')
        .select('state, version')
        .eq('id', 'shared_default_state')
        .single();

      if (fallback.data?.state) {
        const fallbackObj = fallback.data.state;
        fallbackObj.version = Number(fallback.data.version) || Number(fallbackObj.version) || 1;
        return fallbackObj;
      }
    }

    // Fall back to server /api/state composition & disk authoritative backup
    if (typeof window !== 'undefined') {
      try {
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/state', { headers });
        if (res.ok) {
          const body = await res.json();
          if (body?.state) {
            return body.state;
          }
        }
      } catch {
        // Non-blocking
      }
    }

    return null;
  } catch (error: any) {
    if (error.message === 'TABLE_NOT_FOUND') {
      throw error;
    }
    logger.warn("Unable to load state from Supabase:", error?.message || error);

    // Fall back to server /api/state
    if (typeof window !== 'undefined') {
      try {
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/state', { headers });
        if (res.ok) {
          const body = await res.json();
          if (body?.state) {
            return body.state;
          }
        }
      } catch {
        // Non-blocking
      }
    }

    return null;
  }
}

export async function saveToSupabase(
  userEmail: string | null | undefined,
  state: SyncedAppState,
  actionDescription?: string
): Promise<boolean> {
  try {
    if (!state || typeof state !== 'object') return false;

    // Sanitize state: strips synthetic demo records/assignments/users/payments,
    // converts dataSource to 'production', and strips isDemo flag.
    const cleanState = sanitizeProductionState(state);

    if ((cleanState as any).isDemo === true || (cleanState as any)._isPureDemoSimulation === true) {
      logger.warn('[SupabaseSync] Blocked attempt to save purely synthetic demo fixture into production database.');
      return false;
    }

    const docId = userEmail 
      ? `user_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}` 
      : 'shared_default_state';

    const timestamp = new Date().toISOString();
    const updater = userEmail || 'anonymous';
    const nextVer = (typeof (cleanState as any).version === 'number' ? (cleanState as any).version + 1 : 2);
    (cleanState as any).version = nextVer;

    let supabaseSuccess = false;
    let apiSuccess = false;

    // 1. Attempt direct Supabase app_states upsert
    try {
      let { error } = await supabase
        .from('app_states')
        .upsert({
          id: docId,
          state: cleanState,
          version: nextVer,
          updated_at: timestamp,
          updated_by: updater
        });

      if (error && (error.message?.includes('version') || error.code === '42703')) {
        const fallback = await supabase
          .from('app_states')
          .upsert({
            id: docId,
            state: cleanState,
            updated_at: timestamp,
            updated_by: updater
          });
        error = fallback.error;
      }

      if (!error) {
        supabaseSuccess = true;
        if (docId !== 'shared_default_state') {
          try {
            await supabase
              .from('app_states')
              .upsert({
                id: 'shared_default_state',
                state: cleanState,
                version: nextVer,
                updated_at: timestamp,
                updated_by: updater
              });
          } catch {}
        }
      } else if (error.code === '42P01') {
        throw new Error('TABLE_NOT_FOUND');
      }
    } catch (sbErr: any) {
      if (sbErr?.message === 'TABLE_NOT_FOUND') throw sbErr;
      logger.warn('[SupabaseSync] Direct Supabase persistence notice:', sbErr?.message || sbErr);
    }

    // 2. Also dispatch to /api/state to synchronize to the backend and authoritative store
    if (typeof window !== 'undefined') {
      try {
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const resp = await fetch('/api/state', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            state: cleanState,
            userEmail,
            updatedAt: timestamp,
          }),
        });
        if (resp.ok) {
          apiSuccess = true;
        }
      } catch {
        // Non-blocking network fallback
      }
    }

    return supabaseSuccess || apiSuccess;
  } catch (error: any) {
    if (error.message === 'TABLE_NOT_FOUND') {
      throw error;
    }
    logger.warn("Unable to save state to Supabase:", error?.message || error);
    return false;
  }
}

// ─── Real-time subscription ──────────────────────────────────────────────────

/**
 * Subscribes to real-time changes on the app_states table for a given doc ID.
 * Calls `onUpdate` with the new state whenever another session saves.
 * Returns an `unsubscribe` function — call it on component unmount.
 *
 * Usage:
 *   const unsub = subscribeToAppState(userEmail, (newState) => {
 *     // merge newState into local React state
 *   });
 *   // On cleanup: unsub();
 */
export function subscribeToAppState(
  userEmail: string | null | undefined,
  onUpdate: (newState: SyncedAppState) => void
): () => void {
  const docId = userEmail
    ? `user_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`
    : 'shared_default_state';

  const channel = supabase
    .channel(`app_state_${docId}`)
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
          onUpdate(newState);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.info(`[Supabase RT] Subscribed to real-time updates for ${docId}`);
      }
    });

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}
