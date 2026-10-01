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
