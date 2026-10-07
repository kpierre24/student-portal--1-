/**
 * ============================================================================
 * SUPABASE CONNECTOR & AUTH CONFIGURATION ENGINE
 * HTEIM School of Ministry
 * ============================================================================
 * Provides real-time connectivity health checks, latency benchmarking,
 * and in-app configurable authentication/registration policies.
 */

import { 
  supabase, 
  getResolvedSupabaseUrl, 
  getResolvedSupabaseAnonKey, 
  setCustomSupabaseConfig,
  DEFAULT_SUPABASE_PROJECT_URL 
} from './supabaseClient';
import { logger } from './logger';

export interface SupabaseConnectorHealth {
  status: 'connected' | 'degraded' | 'offline' | 'checking';
  latencyMs: number;
  authEndpointOk: boolean;
  databaseEndpointOk: boolean;
  projectUrl: string;
  lastChecked: string;
  errorMessage?: string;
}

export interface AppAuthConfig {
  allowPublicRegistration: boolean;
  autoApproveStudents: boolean;
  allowedRegistrationRoles: ('student' | 'teacher' | 'admin' | 'superadmin')[];
  requireEmailConfirmation: boolean;
  sessionTimeoutMinutes: number; // 0 for no timeout
  allowBiometrics: boolean;
  defaultLoginRole: 'student' | 'teacher' | 'admin' | 'superadmin';
  supabaseCustomUrl?: string;
  supabaseCustomAnonKey?: string;
}

const DEFAULT_AUTH_CONFIG: AppAuthConfig = {
  allowPublicRegistration: true,
  autoApproveStudents: false,
  allowedRegistrationRoles: ['student', 'teacher', 'admin', 'superadmin'],
  requireEmailConfirmation: false,
  sessionTimeoutMinutes: 120, // 2 hours default
  allowBiometrics: true,
  defaultLoginRole: 'student',
  supabaseCustomUrl: DEFAULT_SUPABASE_PROJECT_URL,
};

const AUTH_CONFIG_STORAGE_KEY = 'hteim_auth_portal_config_v2';

/**
 * Retrieves the current Auth configuration from local storage or defaults.
 */
export function getAppAuthConfig(): AppAuthConfig {
  if (typeof window === 'undefined') return DEFAULT_AUTH_CONFIG;
  try {
    const raw = localStorage.getItem(AUTH_CONFIG_STORAGE_KEY);
    const resolvedUrl = getResolvedSupabaseUrl();
    if (!raw) {
      return {
        ...DEFAULT_AUTH_CONFIG,
        supabaseCustomUrl: resolvedUrl,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_AUTH_CONFIG,
      ...parsed,
      supabaseCustomUrl: parsed.supabaseCustomUrl || resolvedUrl,
      allowedRegistrationRoles: Array.isArray(parsed.allowedRegistrationRoles)
        ? parsed.allowedRegistrationRoles
        : DEFAULT_AUTH_CONFIG.allowedRegistrationRoles,
    };
  } catch (err) {
    logger.warn('Failed to parse auth config from storage, using defaults:', err);
    return DEFAULT_AUTH_CONFIG;
  }
}

/**
 * Saves and updates the Auth configuration in the app.
 */
export function saveAppAuthConfig(config: Partial<AppAuthConfig>): AppAuthConfig {
  const current = getAppAuthConfig();
  const updated: AppAuthConfig = { ...current, ...config };
  
  if (config.supabaseCustomUrl) {
    setCustomSupabaseConfig(config.supabaseCustomUrl, config.supabaseCustomAnonKey);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(AUTH_CONFIG_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      logger.warn('Failed to save auth config to storage:', err);
    }
  }
  return updated;
}

/**
 * Tests live connection to Supabase Auth service and Database REST endpoint.
 * Benchmarks roundtrip network latency in milliseconds.
 */
export async function testSupabaseConnector(
  targetUrl?: string,
  targetKey?: string
): Promise<SupabaseConnectorHealth> {
  const supabaseUrl = targetUrl || getResolvedSupabaseUrl();
  const supabaseAnonKey = targetKey || getResolvedSupabaseAnonKey();
  const cleanUrl = supabaseUrl.replace(/\/+$/, '');
  const startTime = performance.now();
  
  let authOk = false;
  let dbOk = false;
  let errorDetail: string | undefined;

  // 1. Test Auth Endpoint via Auth API and native fetch
  try {
    const authFetch = fetch(`${cleanUrl}/auth/v1/health`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
      },
    }).then(res => res.status < 500).catch(() => false);

    const sdkAuth = supabase.auth.getSession().then(({ error }) => !error).catch(() => false);

    const [fetchAuthOk, sdkAuthOk] = await Promise.all([authFetch, sdkAuth]);
    authOk = fetchAuthOk || sdkAuthOk;
  } catch (e: any) {
    authOk = false;
    errorDetail = e?.message || String(e);
  }

  // 2. Test Database REST API Endpoint (PostgREST OpenAPI root and table checks)
  try {
    const restRootFetch = fetch(`${cleanUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
      },
    }).then(res => res.status === 200 || res.status === 401 || res.status === 403).catch(() => false);

    const tableFetch = (async () => {
      try {
        const res = await supabase.from('app_states').select('id').limit(1);
        if (!res.error) return true;
        const msg = res.error.message || '';
        return !msg.toLowerCase().includes('fetch failed') && !msg.toLowerCase().includes('network');
      } catch (err) {
        const msg = String((err as any)?.message || err);
        return !msg.toLowerCase().includes('fetch failed');
      }
    })();

    const [rootOk, tblOk] = await Promise.all([restRootFetch, tableFetch]);
    dbOk = rootOk || tblOk;
  } catch (e: any) {
    dbOk = false;
    if (!errorDetail) errorDetail = e?.message || String(e);
  }

  const duration = Math.round(performance.now() - startTime);

  let status: 'connected' | 'degraded' | 'offline' = 'offline';
  if (authOk && dbOk) {
    status = 'connected';
  } else if (authOk || dbOk) {
    status = 'degraded';
  }

  return {
    status,
    latencyMs: Math.max(12, duration),
    authEndpointOk: authOk,
    databaseEndpointOk: dbOk,
    projectUrl: cleanUrl,
    lastChecked: new Date().toISOString(),
    errorMessage: status === 'offline' ? (errorDetail || 'Unable to reach Supabase endpoints') : undefined
  };
}
