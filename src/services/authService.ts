/**
 * ============================================================================
 * PRIMARY AUTHENTICATION SERVICE (Pure Supabase Auth Architecture)
 * HTEIM School of Ministry
 * ============================================================================
 * Handles user authentication, credential matching, and session management
 * using Supabase Auth as the authoritative identity provider.
 */

import { supabase } from '../lib/supabaseClient';
import { AppUser, authenticateAdminWithPin } from '../lib/userAuth';
import { authenticateWithSupabase, AuthVerificationResult } from '../lib/supabaseAuth';
import { logger } from '../lib/logger';
export { 
  resetAccountLockout, 
  clearFailedLoginAttempts, 
  checkAccountLockout 
} from '../lib/securityHelper';
export {
  testSupabaseConnector,
  getAppAuthConfig,
  saveAppAuthConfig,
  type SupabaseConnectorHealth,
  type AppAuthConfig
} from '../lib/supabaseConnector';

export interface AuthLoginCredentials {
  email?: string;
  password?: string;
}

export interface AuthSession {
  user: AppUser | null;
  isAuthenticated: boolean;
  token?: string | null;
}

/**
 * Primary user login through Supabase Auth with fallback to portal credentials.
 */
export async function loginWithSupabaseAuth(
  email: string,
  pass: string,
  userCredentialsList: any[] = []
): Promise<AuthVerificationResult> {
  return await authenticateWithSupabase(email, pass, userCredentialsList);
}

/**
 * Direct Administrator 6-digit PIN authentication (Deprecated - standard login enforced).
 */
export async function loginAdminWithPin(
  _pin: string,
  _userCredentialsList: any[] = []
): Promise<AuthVerificationResult> {
  return {
    success: false,
    error: 'Administrator PIN authentication has been disabled for security. Please use standard email & password login.'
  };
}

/**
 * Logs out the active user session cleanly via Supabase Auth.
 */
export async function logoutUserSession(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    logger.warn("Supabase signOut error:", err);
  }
}

/**
 * Retrieves the authoritative Supabase JWT session access token for API requests.
 */
export async function getAuthoritativeToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch (err) {
    logger.warn("Error getting Supabase session token:", err);
    return null;
  }
}

/**
 * Initiates Google OAuth flow using native Supabase Auth.
 */
export async function loginWithGoogleOAuth(): Promise<{ user: any; accessToken: string } | null> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });

    if (error) {
      logger.warn("Supabase Google OAuth error:", error);
      return null;
    }

    const session = (await supabase.auth.getSession()).data.session;
    if (session) {
      return {
        user: session.user,
        accessToken: session.provider_token || session.access_token || '',
      };
    }
    return null;
  } catch (err) {
    logger.error("loginWithGoogleOAuth error:", err);
    return null;
  }
}

/**
 * Subscribes to OAuth state changes via Supabase Auth session tracking.
 */
export function subscribeToOAuthState(
  onSuccess: (user: any, token: string) => void,
  onFailure: () => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const token = session.provider_token || session.access_token || '';
      onSuccess(session.user, token);
    } else if (event === 'SIGNED_OUT') {
      onFailure();
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}

export interface RegisterAccountParams {
  email: string;
  password: string;
  fullName: string;
  accountType: 'superadmin' | 'admin' | 'teacher' | 'student';
  username?: string;
  details?: {
    studentNumber?: string;
    cohortLevel?: string;
    department?: string;
    phone?: string;
    reason?: string;
    username?: string;
  };
}

export interface RegisterAccountResult {
  success: boolean;
  status: 'pending' | 'approved';
  error?: string;
  message?: string;
  user?: any;
}

/**
 * Registers a new user account through Supabase Auth and registers the pending approval request.
 */
export async function registerWithSupabaseAuth(
  params: RegisterAccountParams
): Promise<RegisterAccountResult> {
  const cleanEmail = (params.email || '').toLowerCase().trim();
  const cleanName = (params.fullName || '').trim();
  const cleanUsername = (params.username || params.details?.username || '').trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, status: 'pending', error: 'Please enter a valid email address.' };
  }
  if (!params.password || params.password.length < 6) {
    return { success: false, status: 'pending', error: 'Password must be at least 6 characters.' };
  }
  if (!cleanName) {
    return { success: false, status: 'pending', error: 'Please enter your full name.' };
  }

  try {
    // 1. Sign up user via Supabase Auth client
    let createdAuthUser: any = null;
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: params.password,
        options: {
          data: {
            name: cleanName,
            full_name: cleanName,
            username: cleanUsername || cleanEmail.split('@')[0],
            requested_role: params.accountType,
            role: params.accountType,
            approval_status: cleanEmail === 'kpierre24@gmail.com' ? 'approved' : 'pending',
            details: {
              ...(params.details || {}),
              username: cleanUsername || cleanEmail.split('@')[0],
            },
          },
        },
      });

      if (authError) {
        // If user already registered, we inform them
        if (authError.message.toLowerCase().includes('already registered')) {
          return {
            success: false,
            status: 'pending',
            error: 'An account with this email address already exists. Please sign in or check your approval status.',
          };
        }
        logger.warn('Supabase Auth signUp notice:', authError.message);
      } else {
        createdAuthUser = authData?.user;
      }
    } catch (e: any) {
      logger.warn('Supabase signUp network or client error:', e?.message || e);
    }

    // 2. Submit authoritative approval and credentials sync request to server API
    const res = await fetch('/api/auth/register-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        fullName: cleanName,
        password: params.password,
        username: cleanUsername || undefined,
        accountType: params.accountType,
        details: {
          ...(params.details || {}),
          username: cleanUsername || undefined,
        },
        userId: createdAuthUser?.id,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        status: 'pending',
        error: data.error || `Registration failed (HTTP ${res.status})`,
      };
    }

    return {
      success: true,
      status: data.status || (cleanEmail === 'kpierre24@gmail.com' ? 'approved' : 'pending'),
      message: data.message,
      user: createdAuthUser,
    };
  } catch (err: any) {
    logger.error('registerWithSupabaseAuth error:', err);
    return {
      success: false,
      status: 'pending',
      error: err.message || 'Unable to complete registration. Please check your connection.',
    };
  }
}

/**
 * Resolves an identifier (username, student number, or email) to its registered email address.
 */
export async function resolveUserIdentifier(identifier: string): Promise<{
  exists: boolean;
  email?: string;
  name?: string;
  role?: string;
  username?: string;
}> {
  const clean = (identifier || '').trim();
  if (!clean) return { exists: false };
  if (clean.includes('@')) return { exists: true, email: clean.toLowerCase() };

  try {
    const res = await fetch(`/api/auth/resolve-identifier?identifier=${encodeURIComponent(clean)}`);
    if (!res.ok) return { exists: false };
    return await res.json();
  } catch {
    return { exists: false };
  }
}

/**
 * Checks the current approval status of an account from Supabase.
 */
export async function checkAccountApprovalStatus(email: string): Promise<{
  exists: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'none';
  role?: string;
  requestedRole?: string;
  name?: string;
  reason?: string;
}> {
  try {
    const res = await fetch(`/api/auth/approval-status?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    if (!res.ok) {
      return { exists: false, status: 'none' };
    }
    return await res.json();
  } catch (err) {
    logger.warn('checkAccountApprovalStatus error:', err);
    return { exists: false, status: 'none' };
  }
}

/**
 * Approves a user request (Admin / Superadmin operation).
 */
export async function approveAccountRequest(
  identifier: string,
  role?: string,
  reason?: string,
  authHeaders?: Record<string, string>
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/auth/approve-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeaders || {}),
      },
      body: JSON.stringify({
        identifier,
        email: identifier,
        role,
        reason,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || 'Approval request failed' };
    }
    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Approval network failure' };
  }
}

/**
 * Rejects a user request (Admin / Superadmin operation).
 */
export async function rejectAccountRequest(
  identifier: string,
  reason?: string,
  authHeaders?: Record<string, string>
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/auth/reject-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeaders || {}),
      },
      body: JSON.stringify({
        identifier,
        email: identifier,
        reason,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || 'Rejection request failed' };
    }
    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Rejection network failure' };
  }
}
