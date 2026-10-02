import * as jose from 'jose';
import { getServerSupabase, isSupabaseConfigured } from './supabaseServer';
import { logger } from '../../lib/logger';

export interface VerifiedAuthToken {
  uid: string;
  email: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
  role?: string;
}

/**
 * Authoritative Supabase Token Verifier (Security Hardening v1.0).
 * 
 * Strict Cryptographic Verification Policy:
 * 1. Requires valid, non-empty Authorization Bearer token.
 * 2. Unsigned JWTs, base64 JSON blobs, and raw email strings are STRICTLY REJECTED.
 * 3. Verified cryptographically against Supabase Auth API (`supabase.auth.getUser`)
 *    or verified HMAC/RSA signature with `SUPABASE_JWT_SECRET`.
 * 4. Deterministic test-token format allowed ONLY during explicit Vitest test runs (`NODE_ENV === 'test'`).
 */
export async function verifyAuthToken(rawToken: string): Promise<VerifiedAuthToken> {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new Error('No token provided');
  }

  const token = rawToken.startsWith('Bearer ')
    ? rawToken.substring(7).trim()
    : rawToken.trim();

  if (!token || token === 'null' || token === 'undefined') {
    throw new Error('Token is empty');
  }

  // 1. Explicit Vitest / Test environment mock tokens
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    if (token.startsWith('test-token:')) {
      const parts = token.split(':');
      return {
        uid: parts[1] || 'test-uid',
        email: parts[2] || 'test@hteim.edu',
        role: parts[3] || 'student',
        emailVerified: true,
      };
    }
  }

  // Reject email-as-token, base64 json blobs, or non-JWT formats immediately
  if (token.includes('@') && !token.includes('.')) {
    throw new Error('Invalid authentication token: Raw email strings cannot be used as authentication tokens');
  }

  // 2. Primary: Validate via Supabase Auth API (`supabase.auth.getUser`)
  if (isSupabaseConfigured()) {
    try {
      const supabase = getServerSupabase();
      const { data: { user }, error: sbError } = await supabase.auth.getUser(token);
      if (!sbError && user) {
        const email = (user.email || '').toLowerCase().trim();
        const role = (user.app_metadata?.role || user.user_metadata?.role) as string | undefined;
        const name = (user.user_metadata?.name || user.user_metadata?.full_name) as string | undefined;

        return {
          uid: user.id,
          email,
          emailVerified: Boolean(user.email_confirmed_at),
          name,
          role,
        };
      }
    } catch (sbErr) {
      logger.debug("Supabase server auth verification check notice:", sbErr);
    }
  }

  // 3. Cryptographic Signature Verification via SUPABASE_JWT_SECRET (if configured)
  const jwtSecret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
  if (jwtSecret) {
    try {
      const secretBytes = new TextEncoder().encode(jwtSecret);
      const { payload } = await jose.jwtVerify(token, secretBytes, {
        algorithms: ['HS256', 'HS384', 'HS512'],
      });

      if (payload && (payload.sub || payload.email)) {
        const uid = (payload.sub || payload.user_id) as string;
        const email = ((payload.email || '') as string).toLowerCase().trim();
        const userMeta = (payload.user_metadata as any) || {};
        const appMeta = (payload.app_metadata as any) || {};

        return {
          uid: uid || `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
          email,
          name: userMeta.name || userMeta.full_name || (payload.name as string) || undefined,
          role: appMeta.role || (payload.role as string) || undefined,
          emailVerified: Boolean(payload.email_confirmed_at || payload.email_verified),
        };
      }
    } catch (jwtErr: any) {
      logger.debug(`Cryptographic JWT signature verification check notice: ${jwtErr.message}`);
      throw new Error(`Invalid authentication token: ${jwtErr.message}`);
    }
  }

  // If Supabase is not configured and no JWT secret is present, reject the unverified token
  logger.debug(`Authoritative token verification check notice for token prefix: ${token.substring(0, 10)}...`);
  throw new Error('Invalid authentication token: Cryptographic signature verification failed');
}
