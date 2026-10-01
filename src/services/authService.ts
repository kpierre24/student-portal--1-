/**
 * ============================================================================
 * PRIMARY AUTHENTICATION SERVICE
 * HTEIM School of Ministry
 * ============================================================================
 * Handles user authentication, credential matching, and session management
 * using Supabase Auth as primary identity provider, with Google OAuth token
 * acquisition handled through the isolated firebaseAdapter service boundary.
 */

import { supabase } from '../lib/supabaseClient';
import { AppUser, authenticateAdminWithPin } from '../lib/userAuth';
import { authenticateWithSupabase, AuthVerificationResult } from '../lib/supabaseAuth';
import { 
  acquireGoogleOAuthToken, 
  subscribeToGoogleOAuthState, 
  logoutGoogleOAuth 
} from './firebaseAdapter';
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
  pin: string,
  userCredentialsList: any[] = []
): Promise<AuthVerificationResult> {
  return {
    success: false,
    error: 'Administrator PIN authentication has been disabled for security. Please use standard email & password login.'
  };
}

/**
 * Logs out the active user session across Supabase Auth and Google OAuth boundary.
 */
export async function logoutUserSession(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    logger.warn("Supabase signOut error:", err);
  }
  await logoutGoogleOAuth();
}

/**
 * Initiates Google OAuth Popup flow via the isolated firebaseAdapter.
 */
export async function loginWithGoogleOAuth(): Promise<{ user: any; accessToken: string } | null> {
  return await acquireGoogleOAuthToken();
}

/**
 * Subscribes to Google OAuth state changes via the service boundary adapter.
 */
export function subscribeToOAuthState(
  onSuccess: (user: any, token: string) => void,
  onFailure: () => void
): () => void {
  return subscribeToGoogleOAuthState(onSuccess, onFailure);
}
