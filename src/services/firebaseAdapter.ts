/**
 * ============================================================================
 * FIREBASE ADAPTER SERVICE BOUNDARY
 * HTEIM School of Ministry
 * ============================================================================
 * Isolate Firebase capabilities (specifically Google OAuth token acquisition
 * for Google Workspace / Sheets integration) behind a strict service boundary.
 *
 * Core application data persistence and user auth reside primarily in
 * PostgreSQL / Supabase, while this adapter encapsulates Google OAuth credentials.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { getFirebaseConfig } from '../lib/firebaseConfig';
import { logger } from '../lib/logger';

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase App singleton safely
export const firebaseApp = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApp();

export const firebaseAuth = getAuth(firebaseApp);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');

let isSigningIn = false;
let cachedGoogleAccessToken: string | null = null;

export interface GoogleOAuthResult {
  user: FirebaseUser;
  accessToken: string;
}

/**
 * Executes Google OAuth Popup flow specifically to acquire Google Workspace / Sheets API tokens.
 */
export async function acquireGoogleOAuthToken(): Promise<GoogleOAuthResult | null> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('Failed to acquire Google Workspace OAuth token from popup.');
    }

    cachedGoogleAccessToken = credential.accessToken;
    logger.info('Successfully acquired Google Workspace OAuth access token via adapter boundary.');
    return { user: result.user, accessToken: cachedGoogleAccessToken };
  } catch (error: any) {
    logger.error('Google OAuth token acquisition error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

/**
 * Retrieves cached Google OAuth access token if available.
 */
export async function getGoogleOAuthToken(): Promise<string | null> {
  return cachedGoogleAccessToken;
}

/**
 * Subscribes to Firebase Auth state for Google OAuth session tracking.
 */
export function subscribeToGoogleOAuthState(
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
): () => void {
  return onAuthStateChanged(firebaseAuth, async (user: FirebaseUser | null) => {
    if (user) {
      if (cachedGoogleAccessToken && onAuthSuccess) {
        onAuthSuccess(user, cachedGoogleAccessToken);
      } else if (!isSigningIn && onAuthFailure) {
        onAuthFailure();
      }
    } else {
      cachedGoogleAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
}

/**
 * Retrieves the authoritative Firebase ID token for the currently authenticated user.
 */
export async function getAuthoritativeFirebaseIdToken(): Promise<string | null> {
  try {
    const user = firebaseAuth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (err) {
    logger.warn('Error obtaining Firebase ID token:', err);
    return null;
  }
}

/**
 * Signs out of Firebase Auth session cleanly.
 */
export async function logoutGoogleOAuth(): Promise<void> {
  try {
    await firebaseSignOut(firebaseAuth);
    cachedGoogleAccessToken = null;
  } catch (err) {
    logger.warn('Error signing out of Firebase OAuth adapter:', err);
  }
}
