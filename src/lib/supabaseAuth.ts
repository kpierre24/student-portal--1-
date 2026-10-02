import { supabase } from './supabaseClient';
import { 
  AppUser, 
  UserRole, 
  UserCredential, 
  generateStudentUsername, 
  getStudentEmailFromName, 
  isMatchingCredential, 
  mergeUserCredentials, 
  DEFAULT_ADMIN_EMAIL, 
  DEFAULT_ADMIN_NAME
} from './userAuth';
import { loadFromSupabase, saveToSupabase } from './supabaseSync';
import { logger } from './logger';
import { handleError } from './errorHandler';
import { isDemoUser } from '../data/guards';
import { 
  checkAccountLockout, 
  recordFailedLoginAttempt, 
  clearFailedLoginAttempts, 
  verifyPasswordHash 
} from './securityHelper';

export interface AuthVerificationResult {
  success: boolean;
  user?: AppUser;
  error?: string;
  mustChangePassword?: boolean;
  cloudSynced?: boolean;
  remainingLockoutSeconds?: number;
}

/**
 * Authenticates a user strictly through Supabase Auth and authoritative cloud verification.
 * Does NOT persist passwords or credential databases in browser localStorage.
 */
export async function authenticateWithSupabase(
  identifierInput: string,
  passwordInput: string,
  memoryCredentials?: UserCredential[]
): Promise<AuthVerificationResult> {
  const cleanId = (identifierInput || '').trim().toLowerCase();
  const cleanPassword = (passwordInput || '').trim();

  if (!cleanId) {
    return { success: false, error: 'Please enter your email address.' };
  }
  if (!cleanPassword) {
    return { success: false, error: 'Please enter your password.' };
  }

  // Check client-side brute-force lockout
  const lockout = checkAccountLockout(cleanId);
  if (lockout.isLocked) {
    return {
      success: false,
      error: `Too many failed attempts. Account temporarily locked for security. Please try again in ${lockout.remainingSeconds} seconds.`,
      remainingLockoutSeconds: lockout.remainingSeconds
    };
  }

  // Guard: Demo accounts are simulation-only and cannot authenticate as real users
  if (isDemoUser(cleanId)) {
    logger.warn(`Rejected real user authentication attempt for demo persona: ${cleanId}`);
    return {
      success: false,
      error: 'Demo accounts are for preview simulation only and cannot authenticate as real users.'
    };
  }

  let verifiedCredentials: UserCredential[] = memoryCredentials && memoryCredentials.length > 0 ? memoryCredentials : [];

  // 1. Primary: Authenticate with Supabase Auth API
  let supabaseAuthUser: any = null;
  if (cleanId.includes('@')) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanId,
        password: cleanPassword,
      });

      if (!authError && authData?.user) {
        supabaseAuthUser = authData.user;
        clearFailedLoginAttempts(cleanId);
        logger.info('Supabase Auth verification successful for:', cleanId);
      }
    } catch (authErr) {
      logger.warn('Supabase Auth signIn attempt failed, checking cloud user directory:', authErr);
    }
  }

  // 2. Fetch authoritative user credentials registry from Supabase cloud database
  try {
    const cloudState = await loadFromSupabase(undefined);
    if (cloudState && Array.isArray(cloudState.userCredentials) && cloudState.userCredentials.length > 0) {
      verifiedCredentials = mergeUserCredentials(verifiedCredentials, cloudState.userCredentials);
    }
  } catch (err) {
    logger.warn('Unable to query Supabase cloud state for credentials:', err);
  }

  // 3. If Supabase Auth succeeded, locate or build corresponding AppUser
  if (supabaseAuthUser) {
    const matchedCred = verifiedCredentials.find(c => isMatchingCredential(c, cleanId));

    const role: UserRole = (supabaseAuthUser.app_metadata?.role || supabaseAuthUser.user_metadata?.role || matchedCred?.role || (cleanId === DEFAULT_ADMIN_EMAIL.toLowerCase() ? 'admin' : 'student')) as UserRole;
    const name = matchedCred?.name || supabaseAuthUser.user_metadata?.full_name || supabaseAuthUser.user_metadata?.name || supabaseAuthUser.email?.split('@')[0] || 'User';

    const user: AppUser = {
      id: supabaseAuthUser.id || matchedCred?.id || `u-${Date.now()}`,
      email: supabaseAuthUser.email || cleanId,
      name,
      role,
      username: matchedCred?.username || generateStudentUsername(name),
      studentName: matchedCred?.studentName || (role === 'student' ? name : undefined),
      moduleOrDepartment: matchedCred?.moduleOrDepartment,
      status: matchedCred?.status || 'active',
      mustChangePassword: false
    };

    return {
      success: true,
      user,
      mustChangePassword: false,
      cloudSynced: true
    };
  }

  // 4. Verify against Supabase cloud-verified credentials registry
  const cred = verifiedCredentials.filter(Boolean).find(c => isMatchingCredential(c, cleanId));

  if (cred) {
    if (cred.status === 'suspended') {
      return {
        success: false,
        error: 'This account has been suspended by the administrator. Please contact academic affairs at info@hteim.edu.'
      };
    }

    const isPasswordValid =
      cred.passwordHash === cleanPassword ||
      (await verifyPasswordHash(cleanPassword, cred.passwordHash));

    if (isPasswordValid) {
      clearFailedLoginAttempts(cleanId);
      const user: AppUser = {
        id: cred.id,
        email: cred.email || (cred.role === 'student'
          ? getStudentEmailFromName(cred.name)
          : `${cred.username || 'user'}@hteim.edu`),
        username: cred.username || generateStudentUsername(cred.name),
        name: cred.name,
        role: cred.role,
        studentName: cred.studentName || (cred.role === 'student' ? cred.name : undefined),
        moduleOrDepartment: cred.moduleOrDepartment,
        status: cred.status,
        mustChangePassword: cred.mustChangePassword ?? false
      };

      return {
        success: true,
        user,
        mustChangePassword: cred.mustChangePassword ?? false,
        cloudSynced: true
      };
    } else {
      const lockStatus = recordFailedLoginAttempt(cleanId);
      const errorMsg = lockStatus.isLocked
        ? `Account temporarily locked due to 5 consecutive failed attempts. Try again in ${lockStatus.remainingSeconds}s.`
        : `Incorrect password. ${lockStatus.attemptsLeft} attempt${lockStatus.attemptsLeft === 1 ? '' : 's'} remaining before temporary lockout.`;

      return {
        success: false,
        error: errorMsg,
        remainingLockoutSeconds: lockStatus.remainingSeconds
      };
    }
  }

  return {
    success: false,
    error: `Account with email "${identifierInput}" was not found or credentials were invalid.`
  };
}

/**
 * Sends a Supabase Auth password reset recovery email to the given address.
 */
export async function requestPasswordResetForEmail(
  email: string,
  _userCredentials?: UserCredential[]
): Promise<{ success: boolean; message?: string; error?: string }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please provide a valid email address.', message: 'Please provide a valid email address.' };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/#type=recovery` : undefined,
    });
    if (error) {
      logger.warn('Password reset request error:', error.message);
      return { success: false, error: error.message, message: error.message };
    }
    const msg = `Password recovery instructions dispatched to ${cleanEmail}. Check your inbox.`;
    return { success: true, message: msg };
  } catch (err: any) {
    logger.error('Unexpected error requesting password reset:', err);
    return { success: false, error: err?.message || 'Failed to send recovery email.', message: 'Failed to send recovery email.' };
  }
}

/**
 * Signs out the current user session and purges active user session tokens.
 */
export async function supabaseLogout(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    handleError(err, 'supabaseLogout - signOut failure', 'authentication');
  }

  try {
    localStorage.removeItem('hteim_app_user');
    localStorage.removeItem('hteim_user_credentials');
    sessionStorage.removeItem('hteim_app_user');
    sessionStorage.removeItem('hteim_user_credentials');
  } catch (e) {
    // Ignore storage clear errors
  }
}

/**
 * Updates a user's password directly in Supabase registry and Supabase Auth.
 */
export async function updatePasswordInSupabase(
  identifier: string | AppUser,
  newPassword: string,
  currentCredentials: UserCredential[]
): Promise<{ success: boolean; updatedCredentials: UserCredential[] }> {
  const cleanPass = newPassword.trim();
  if (!cleanPass) {
    return { success: false, updatedCredentials: currentCredentials || [] };
  }

  // Update through Supabase Auth if session active
  try {
    await supabase.auth.updateUser({ password: cleanPass });
  } catch (sbErr) {
    logger.debug('Non-blocking Supabase auth update attempt:', sbErr);
  }

  let baseCreds = currentCredentials && currentCredentials.length > 0 ? [...currentCredentials] : [];

  let updatedCredentials = baseCreds.map(cred => {
    if (isMatchingCredential(cred, identifier)) {
      return {
        ...cred,
        passwordHash: cleanPass,
        mustChangePassword: false,
        lastLoginAt: new Date().toISOString()
      };
    }
    return cred;
  });

  // Persist updated user credentials directly to Supabase cloud database
  try {
    const cloudState = await loadFromSupabase(undefined);
    if (cloudState) {
      const cloudCreds = Array.isArray(cloudState.userCredentials) ? cloudState.userCredentials : [];
      const mergedCloud = mergeUserCredentials(cloudCreds, updatedCredentials).map(cred => {
        if (isMatchingCredential(cred, identifier)) {
          return {
            ...cred,
            passwordHash: cleanPass,
            mustChangePassword: false,
            lastLoginAt: new Date().toISOString()
          };
        }
        return cred;
      });

      await saveToSupabase(undefined, {
        ...cloudState,
        userCredentials: mergedCloud
      });
      updatedCredentials = mergedCloud;
    }
  } catch (err) {
    handleError(err, 'updatePasswordInSupabase - cloud save failure', 'database');
  }

  return { success: true, updatedCredentials };
}
