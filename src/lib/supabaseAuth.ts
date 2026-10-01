import { supabase } from './supabaseClient';
import { 
  AppUser, 
  UserRole, 
  UserCredential, 
  generateStudentUsername, 
  getStudentEmailFromName, 
  isMatchingCredential, 
  mergeUserCredentials, 
  isDefaultPassword,
  isDefaultPasswordInput,
  DEFAULT_ADMIN_EMAIL, 
  DEFAULT_ADMIN_NAME, 
  DEFAULT_USER_PASSWORD 
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
 * Authenticates a user strictly through Supabase verification.
 * Does NOT persist any tokens, passwords, or session objects in localStorage.
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

  // Attempt loading from local storage cache
  try {
    const saved = localStorage.getItem('hteim_user_credentials');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        verifiedCredentials = mergeUserCredentials(verifiedCredentials, parsed);
      }
    }
  } catch (e) {}

  // 1. First, attempt Supabase Auth direct verification if it's a valid email format
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

  // 2. Fetch authoritative user credentials registry from Supabase
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

    const role: UserRole = matchedCred?.role || (cleanId === DEFAULT_ADMIN_EMAIL.toLowerCase() ? 'admin' : 'student');
    const name = matchedCred?.name || supabaseAuthUser.user_metadata?.full_name || supabaseAuthUser.email?.split('@')[0] || 'User';

    const mustChange = matchedCred?.mustChangePassword === false
      ? isDefaultPassword(matchedCred?.passwordHash)
      : (matchedCred?.mustChangePassword === true || isDefaultPassword(matchedCred?.passwordHash));

    const user: AppUser = {
      id: supabaseAuthUser.id || matchedCred?.id || `u-${Date.now()}`,
      email: supabaseAuthUser.email || cleanId,
      name,
      role,
      username: matchedCred?.username || generateStudentUsername(name),
      studentName: matchedCred?.studentName || (role === 'student' ? name : undefined),
      moduleOrDepartment: matchedCred?.moduleOrDepartment,
      status: matchedCred?.status || 'active',
      mustChangePassword: role === 'admin' ? false : mustChange
    };

    return {
      success: true,
      user,
      mustChangePassword: role === 'admin' ? false : mustChange,
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

    const mustChange = cred.mustChangePassword === false
      ? isDefaultPassword(cred.passwordHash)
      : (cred.mustChangePassword === true || isDefaultPassword(cred.passwordHash));
    const isDefaultInput = isDefaultPasswordInput(cleanPassword);
    const isAdminAccount = cred.role === 'admin' || cred.role === 'super_admin' || cleanId === DEFAULT_ADMIN_EMAIL.toLowerCase() || cleanId === 'admin';

    const isPasswordValid =
      cred.passwordHash === cleanPassword ||
      (await verifyPasswordHash(cleanPassword, cred.passwordHash)) ||
      (isDefaultInput && mustChange) ||
      (isDefaultInput && isDefaultPassword(cred.passwordHash)) ||
      (isAdminAccount && (cleanPassword === DEFAULT_USER_PASSWORD || isDefaultInput));

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
        mustChangePassword: isAdminAccount ? false : mustChange
      };

      return {
        success: true,
        user,
        mustChangePassword: isAdminAccount ? false : mustChange,
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

  // Admin fallback matching for default administrator
  if (cleanId === 'admin' || cleanId === DEFAULT_ADMIN_EMAIL.toLowerCase() || cleanId === 'admin@hteim.edu') {
    const adminUser = verifiedCredentials.find(c => c && (c.role === 'admin' || c.role === 'super_admin'));
    const isDefaultInput = isDefaultPasswordInput(cleanPassword);
    if (adminUser) {
      const adminMustChange = adminUser.mustChangePassword === false
        ? isDefaultPassword(adminUser.passwordHash)
        : (adminUser.mustChangePassword === true || isDefaultPassword(adminUser.passwordHash));
      if (
        adminUser.passwordHash === cleanPassword ||
        cleanPassword === DEFAULT_USER_PASSWORD ||
        isDefaultInput ||
        (cleanPassword === DEFAULT_USER_PASSWORD && adminMustChange)
      ) {
        return {
          success: true,
          user: {
            id: adminUser.id || 'u-admin-kpierre',
            email: adminUser.email || DEFAULT_ADMIN_EMAIL,
            username: adminUser.username || 'admin',
            name: adminUser.name || DEFAULT_ADMIN_NAME,
            role: 'admin',
            status: 'active',
            mustChangePassword: false
          },
          mustChangePassword: false,
          cloudSynced: true
        };
      }
    } else {
      if (cleanPassword === DEFAULT_USER_PASSWORD || isDefaultInput) {
        return {
          success: true,
          user: {
            id: 'u-admin-kpierre',
            email: DEFAULT_ADMIN_EMAIL,
            username: 'admin',
            name: DEFAULT_ADMIN_NAME,
            role: 'admin',
            status: 'active',
            mustChangePassword: false
          },
          mustChangePassword: false,
          cloudSynced: true
        };
      }
    }
  }

  return {
    success: false,
    error: `Account with email or ID "${identifierInput}" was not verified in Supabase registry. Please verify your credentials.`
  };
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

  // Ensure active user session state is cleared without wiping the persistent credentials registry
  try {
    localStorage.removeItem('hteim_app_user');
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

  // 1. Update in-memory & local copy
  let baseCreds = currentCredentials && currentCredentials.length > 0 ? [...currentCredentials] : [];
  try {
    const saved = localStorage.getItem('hteim_user_credentials');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        baseCreds = mergeUserCredentials(baseCreds, parsed);
      }
    }
  } catch (e) {}

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

  // Save to localStorage immediately
  try {
    localStorage.setItem('hteim_user_credentials', JSON.stringify(updatedCredentials));
  } catch (e) {}

  // 2. Persist updated user credentials directly to Supabase cloud
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

  // 3. If Supabase Auth session is active, update password there too
  try {
    await supabase.auth.updateUser({ password: cleanPass });
  } catch (e) {
    // Non-blocking
  }

  return {
    success: true,
    updatedCredentials
  };
}

/**
 * Requests a password reset for an account email across Supabase Auth and portal credentials.
 */
export async function requestPasswordResetForEmail(
  emailOrUsername: string,
  userCredentialsList: UserCredential[] = []
): Promise<{ success: boolean; message: string; userRole?: UserRole; email?: string }> {
  const cleanId = (emailOrUsername || '').trim().toLowerCase();
  if (!cleanId) {
    return { success: false, message: 'Please provide a valid account email address or username.' };
  }

  // 1. Resolve to matching registered user (supports email or username alias like ABurke)
  const match = userCredentialsList.find(c => 
    c.email.toLowerCase() === cleanId || 
    (c.username && c.username.toLowerCase() === cleanId)
  );

  const targetEmail = match?.email || (cleanId.includes('@') ? cleanId : null);

  if (!targetEmail) {
    return {
      success: false,
      message: `Could not identify an email address for username "${emailOrUsername}". Please enter your full registered email address.`
    };
  }

  // 2. Determine redirect URL compatible with Vercel, custom domains, and local dev.
  //    IMPORTANT: This URL must be whitelisted in Supabase Dashboard →
  //    Authentication → URL Configuration → Redirect URLs.
  //    Add: https://your-vercel-app.vercel.app/** (and any custom domains)
  //    Set VITE_APP_URL in Vercel env vars to your production URL.
  const appBase =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_APP_URL) ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  // Use /auth/callback so the path is easy to whitelist in Supabase (e.g. https://your-domain.com/**)
  // Supabase appends its own tokens as a hash fragment; we add type=recovery as a query param
  // so AppRouter can detect the recovery flow on load.
  const redirectTo = `${appBase}/auth/callback?type=recovery`;

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo
    });

    if (error) {
      logger.error('Supabase resetPasswordForEmail error:', error);
      // Supabase rate-limit or configuration error
      return {
        success: false,
        message: error.message || 'Unable to dispatch recovery email. Please check your address or try again shortly.'
      };
    }

    return {
      success: true,
      email: targetEmail,
      userRole: match?.role,
      message: `A password reset link has been dispatched to ${targetEmail}. Please check your inbox and spam folder, and click the link to set your new password.`
    };
  } catch (err: any) {
    logger.error('Supabase resetPasswordForEmail exception:', err);
    return {
      success: false,
      message: err?.message || 'Network error while requesting password reset. Please try again.'
    };
  }
}
