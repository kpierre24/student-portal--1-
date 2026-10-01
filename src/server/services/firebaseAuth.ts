/**
 * @deprecated Use src/server/services/supabaseTokenVerifier.ts instead.
 * This file is retained as a migration bridge for test suites and legacy imports.
 */

import { verifyAuthToken, VerifiedAuthToken } from './supabaseTokenVerifier';

export type VerifiedFirebaseToken = VerifiedAuthToken;

export function getFirebaseProjectId(): string {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    'classroomhq-qzqnp'
  );
}

/**
 * Validates an authoritative token. Delegates to the Supabase-first verifyAuthToken.
 */
export async function verifyIdToken(rawToken: string): Promise<VerifiedFirebaseToken> {
  return await verifyAuthToken(rawToken);
}
