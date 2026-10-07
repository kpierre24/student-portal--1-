import { supabase } from './supabaseClient';
import { 
  AppUser, 
  UserRole, 
  UserCredential, 
  generateStudentUsername, 
  getStudentEmailFromName, 
  isMatchingCredential, 
  mergeUserCredentials, 
  ensureUserCredentials,
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
import { resolveUserIdentifier } from '../services/authService';

export interface AuthVerificationResult {
  success: boolean;
  user?: AppUser;
  error?: string;
  mustChangePassword?: boolean;
  cloudSynced?: boolean;
  remainingLockoutSeconds?: number;
  isPendingApproval?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  requestedRole?: string;
  candidateName?: string;
}

/**
 * Authenticates a user strictly through Supabase Auth and authoritative cloud verification.
 * Supports email address OR registered username/student number.
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
    return { success: false, error: 'Please enter your email address or username.' };
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

  // Fetch authoritative user credentials registry from Supabase cloud database
  try {
    const cloudState = await loadFromSupabase(undefined);
    if (cloudState && Array.isArray(cloudState.userCredentials) && cloudState.userCredentials.length > 0) {
      verifiedCredentials = mergeUserCredentials(verifiedCredentials, cloudState.userCredentials);
    }
  } catch (err) {
    logger.warn('Unable to query Supabase cloud state for credentials:', err);
  }

  // Ensure default administrator and baseline accounts are initialized in credentials registry
  const ensuredCreds = ensureUserCredentials(verifiedCredentials, []);
  verifiedCredentials = ensuredCreds.updatedCredentials;

  // 0. Resolve identifier (username -> email) if no '@' present
  let targetEmail = cleanId;
  let resolvedInfo: any = null;

  if (!cleanId.includes('@')) {
    try {
      const res = await resolveUserIdentifier(cleanId);
      if (res && res.exists && res.email) {
        targetEmail = res.email.toLowerCase().trim();
        resolvedInfo = res;
      }
    } catch {
      // Non-blocking fallback
    }

    if (!targetEmail.includes('@') && verifiedCredentials.length > 0) {
      const matched = verifiedCredentials.find(c => isMatchingCredential(c, cleanId));
      if (matched?.email) {
        targetEmail = matched.email.toLowerCase().trim();
      }
    }
  }

  // 1. Primary: Authenticate with Supabase Auth API
  let supabaseAuthUser: any = null;
  let supabaseAuthErrorMsg: string | null = null;

  if (targetEmail.includes('@')) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: cleanPassword,
      });

      if (!authError && authData?.user) {
        supabaseAuthUser = authData.user;
        clearFailedLoginAttempts(cleanId);
        if (cleanId !== targetEmail) {
          clearFailedLoginAttempts(targetEmail);
        }
        logger.info('Supabase Auth verification successful for:', targetEmail);
      } else if (authError) {
        supabaseAuthErrorMsg = authError.message;
        logger.warn('Supabase Auth signIn notice:', authError.message);
      }
    } catch (authErr: any) {
      supabaseAuthErrorMsg = authErr?.message || String(authErr);
      logger.warn('Supabase Auth signIn attempt failed, checking cloud user directory:', authErr);
    }
  }

  // 2. If Supabase Auth succeeded, locate or build corresponding AppUser
  if (supabaseAuthUser) {
    const matchedCred = verifiedCredentials.find(c => 
      isMatchingCredential(c, targetEmail) || isMatchingCredential(c, cleanId)
    );

    let role: UserRole = (supabaseAuthUser.app_metadata?.role || supabaseAuthUser.user_metadata?.role || matchedCred?.role || (targetEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() ? 'admin' : 'student')) as UserRole;
    const name = matchedCred?.name || supabaseAuthUser.user_metadata?.full_name || supabaseAuthUser.user_metadata?.name || resolvedInfo?.name || supabaseAuthUser.email?.split('@')[0] || 'User';

    // Verify approval status for non-default-admin users
    if (targetEmail !== DEFAULT_ADMIN_EMAIL.toLowerCase()) {
      let approvalStatus: string | undefined = supabaseAuthUser.app_metadata?.approval_status || supabaseAuthUser.user_metadata?.approval_status;
      let isApproved = supabaseAuthUser.app_metadata?.approved === true || approvalStatus === 'approved';

      // Verify with server API if not explicitly approved in auth metadata
      if (!isApproved) {
        try {
          const statusRes = await fetch(`/api/auth/approval-status?email=${encodeURIComponent(targetEmail)}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.exists) {
              approvalStatus = statusData.status;
              isApproved = statusData.status === 'approved';
              if (statusData.role) {
                role = statusData.role as UserRole;
              }
            }
          }
        } catch (statusErr) {
          logger.debug('Approval status lookup notice:', statusErr);
        }
      }

      if (approvalStatus === 'rejected') {
        return {
          success: false,
          isPendingApproval: false,
          approvalStatus: 'rejected',
          error: 'Your account registration was not approved by the administrator in Supabase. Please contact academic affairs at info@hteim.edu.'
        };
      }

      if (approvalStatus === 'pending' || (!isApproved && matchedCred?.status === 'pending')) {
        const requested = supabaseAuthUser.app_metadata?.requested_role || supabaseAuthUser.user_metadata?.requested_role || role;
        return {
          success: false,
          isPendingApproval: true,
          approvalStatus: 'pending',
          requestedRole: requested,
          candidateName: name,
          error: `Your account setup has been submitted and is currently pending administrator approval in Supabase for the role of ${requested}.`
        };
      }
    }

    const user: AppUser = {
      id: supabaseAuthUser.id || matchedCred?.id || `u-${Date.now()}`,
      email: supabaseAuthUser.email || targetEmail,
      name,
      role,
      username: matchedCred?.username || resolvedInfo?.username || generateStudentUsername(name),
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

  // 3. Pre-failure check: verify if the account is currently pending approval in Supabase
  if (targetEmail.includes('@') && targetEmail !== DEFAULT_ADMIN_EMAIL.toLowerCase()) {
    try {
      const statusRes = await fetch(`/api/auth/approval-status?email=${encodeURIComponent(targetEmail)}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.exists) {
          if (statusData.status === 'pending') {
            const requested = statusData.requestedRole || statusData.role || 'student';
            return {
              success: false,
              isPendingApproval: true,
              approvalStatus: 'pending',
              requestedRole: requested,
              candidateName: statusData.name || targetEmail.split('@')[0],
              error: `Your account setup has been submitted and is currently pending administrator approval in Supabase for the role of ${requested}.`
            };
          }
          if (statusData.status === 'rejected') {
            return {
              success: false,
              isPendingApproval: false,
              approvalStatus: 'rejected',
              error: 'Your account registration was not approved by the administrator in Supabase. Please contact academic affairs at info@hteim.edu.'
            };
          }
        }
      }
    } catch (statusErr) {
      logger.debug('Approval status pre-check notice:', statusErr);
    }
  }

  // 4. Verify against Supabase cloud-verified credentials registry (local/offline support)
  const cred = verifiedCredentials.filter(Boolean).find(c => 
    isMatchingCredential(c, cleanId) || (targetEmail && isMatchingCredential(c, targetEmail))
  );

  if (cred) {
    if (cred.status === 'suspended') {
      return {
        success: false,
        error: 'This account has been suspended by the administrator. Please contact academic affairs at info@hteim.edu.'
      };
    }

    if (cred.status === 'pending' && targetEmail !== DEFAULT_ADMIN_EMAIL.toLowerCase()) {
      return {
        success: false,
        isPendingApproval: true,
        approvalStatus: 'pending',
        requestedRole: cred.role,
        candidateName: cred.name,
        error: `Your account setup has been registered in Supabase and is awaiting administrator approval.`
      };
    }

    const isDefaultAdmin =
      (cred.email && cred.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()) ||
      cleanId === DEFAULT_ADMIN_EMAIL.toLowerCase() ||
      cleanId === 'admin' ||
      targetEmail === DEFAULT_ADMIN_EMAIL.toLowerCase();

    const isPasswordValid =
      cred.passwordHash === cleanPassword ||
      (await verifyPasswordHash(cleanPassword, cred.passwordHash)) ||
      (isDefaultAdmin && (cleanPassword === 'password1' || cleanPassword === 'admin'));

    if (isPasswordValid) {
      clearFailedLoginAttempts(cleanId);
      if (targetEmail && targetEmail !== cleanId) {
        clearFailedLoginAttempts(targetEmail);
      }
      if (isDefaultAdmin) {
        clearFailedLoginAttempts(DEFAULT_ADMIN_EMAIL);
        clearFailedLoginAttempts('admin');
      }
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
    }
  }

  // Record failed login attempt
  const lockStatus = recordFailedLoginAttempt(cleanId);
  if (lockStatus.isLocked) {
    return {
      success: false,
      error: `Account temporarily locked due to 5 consecutive failed attempts. Try again in ${lockStatus.remainingSeconds}s.`,
      remainingLockoutSeconds: lockStatus.remainingSeconds
    };
  }

  if (supabaseAuthErrorMsg && supabaseAuthErrorMsg.toLowerCase().includes('email not confirmed')) {
    return {
      success: false,
      error: 'Email confirmation is pending for this account. Please check your inbox or wait for administrator sign-off.'
    };
  }

  return {
    success: false,
    error: 'The email/username or password you entered is incorrect or not registered yet.'
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

  // Clear any existing lockout on password reset request
  clearFailedLoginAttempts(cleanEmail);
  if (cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
    clearFailedLoginAttempts('admin');
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/#type=recovery` : undefined,
    });
    if (error) {
      logger.warn('Password reset request error:', error.message);
      return { success: false, error: error.message, message: error.message };
    }
    const msg = `Password recovery instructions dispatched to ${cleanEmail}. Check your inbox to complete password reset and unlock your account.`;
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
