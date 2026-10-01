import { supabase } from './supabaseClient';
import { SyncedAppState } from './firebaseSync';
import { logger } from './logger';
import { sanitizeProductionState } from '../data/guards';

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

    return null;
  } catch (error: any) {
    if (error.message === 'TABLE_NOT_FOUND') {
      throw error;
    }
    logger.warn("Unable to load state from Supabase:", error?.message || error);
    return null;
  }
}

export async function saveToSupabase(
  userEmail: string | null | undefined,
  state: SyncedAppState
): Promise<boolean> {
  try {
    // Guard: Demo state must never be saved to production database
    if (state.dataSource === 'demo' || (state as any).isDemo === true) {
      logger.warn('[SupabaseSync] Blocked attempt to save demo state into production database.');
      return false;
    }

    const cleanState = sanitizeProductionState(state);

    const docId = userEmail 
      ? `user_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}` 
      : 'shared_default_state';

    const timestamp = new Date().toISOString();
    const updater = userEmail || 'anonymous';
    const nextVer = (typeof (cleanState as any).version === 'number' ? (cleanState as any).version + 1 : 2);
    (cleanState as any).version = nextVer;

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

    if (error) {
      if (error.code === '42P01') {
        throw new Error('TABLE_NOT_FOUND');
      }
      return false;
    }

    // Always keep shared_default_state updated so published or guest views get the latest workspace state
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
      } catch {
        await supabase
          .from('app_states')
          .upsert({
            id: 'shared_default_state',
            state: cleanState,
            updated_at: timestamp,
            updated_by: updater
          });
      }
    }

    return true;
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
