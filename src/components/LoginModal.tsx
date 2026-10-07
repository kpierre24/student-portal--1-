import React, { useState, useEffect } from 'react';
import { useAccessibleModal } from '../lib/useAccessibleModal';
import { LogoImage } from './LogoImage';
import { 
  ShieldCheck, 
  GraduationCap, 
  UserCheck, 
  KeyRound, 
  Lock, 
  Sparkles, 
  AlertCircle, 
  ArrowRight,
  X,
  RefreshCw,
  Mail,
  BookMarked,
  Fingerprint,
  Crown,
  Clock,
  UserPlus,
  CheckCircle2,
  Phone,
  Building,
  User,
  AtSign,
  Activity,
  Sliders,
  Eye,
  EyeOff,
  Server,
  Database,
  Check,
  HelpCircle
} from 'lucide-react';
import { AppUser, UserRole, UserCredential, DEFAULT_ADMIN_EMAIL, generateStudentUsername, getStudentEmailFromName } from '../lib/userAuth';
import { 
  loginWithSupabaseAuth as authenticateWithSupabase,
  registerWithSupabaseAuth,
  checkAccountApprovalStatus,
  testSupabaseConnector,
  getAppAuthConfig,
  saveAppAuthConfig,
  resetAccountLockout,
  SupabaseConnectorHealth,
  AppAuthConfig
} from '../services/authService';
import { updatePasswordInSupabase } from '../lib/supabaseAuth';
import { classifyError, handleError } from '../lib/errorHandler';
import { 
  authenticateWithBiometrics, 
  isBiometricAvailable, 
  getEnrolledBiometricProfiles, 
  isBiometricEnrolledForUser,
  getBiometricPlatformDetails 
} from '../lib/biometricAuth';
import { triggerHapticFeedback } from '../lib/capacitorBridge';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { BiometricEnrollPromptModal } from './BiometricEnrollPromptModal';

interface LoginModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onLoginSuccess: (user: AppUser) => void;
  onLogout?: () => void;
  userCredentials?: UserCredential[];
  onChangePassword?: (emailOrUsername: string | AppUser, newPassword: string) => void;
  currentUser?: AppUser | null;
  onSyncCredentials?: (creds: UserCredential[]) => void;
  onOpenResetModal?: (email: string) => void;
}

const MINISTRY_SCRIPTURES = [
  {
    verse: "2 Timothy 2:15",
    text: "Study to show thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth.",
    theme: "Academic Diligence"
  },
  {
    verse: "Matthew 28:19-20",
    text: "Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost: Teaching them to observe all things whatsoever I have commanded you.",
    theme: "The Great Commission"
  },
  {
    verse: "Proverbs 4:7",
    text: "Wisdom is the principal thing; therefore get wisdom: and with all thy getting get understanding. Exalt her, and she shall promote thee.",
    theme: "Godly Wisdom"
  },
  {
    verse: "Ephesians 4:11-12",
    text: "And he gave some, apostles; and some, prophets; and some, evangelists; and some, pastors and teachers; For the perfecting of the saints, for the work of the ministry, for the edifying of the body of Christ.",
    theme: "Ministry Calling"
  },
  {
    verse: "Colossians 3:23-24",
    text: "And whatsoever ye do, do it heartily, as to the Lord, and not unto men; Knowing that of the Lord ye shall receive the reward of the inheritance: for ye serve the Lord Christ.",
    theme: "Servant Leadership"
  }
];

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen = true,
  onClose,
  onLoginSuccess,
  userCredentials = [],
  onChangePassword,
  onOpenResetModal
}) => {
  // Mode: signin | register | status | connector
  const [authMode, setAuthMode] = useState<'signin' | 'register' | 'status' | 'connector'>('signin');

  // Sign In State
  const [activeTab, setActiveTab] = useState<UserRole>('student');
  const [isVerifying, setIsVerifying] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scriptureIndex, setScriptureIndex] = useState(0);

  // Biometrics
  const [isBiometricBusy, setIsBiometricBusy] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [promptBiometricUser, setPromptBiometricUser] = useState<AppUser | null>(null);

  // Registration Form State
  const [regAccountType, setRegAccountType] = useState<'superadmin' | 'admin' | 'teacher' | 'student'>('student');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regPhone, setRegPhone] = useState('');
  const [regCohortLevel, setRegCohortLevel] = useState('Level 1 Foundation');
  const [regStudentNumber, setRegStudentNumber] = useState('');
  const [regDepartment, setRegDepartment] = useState('School of the Apostles');
  const [regReason, setRegReason] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Status Lookup State
  const [lookupIdentifier, setLookupIdentifier] = useState('');
  const [statusResult, setStatusResult] = useState<{
    exists: boolean;
    status: 'pending' | 'approved' | 'rejected' | 'none';
    role?: string;
    requestedRole?: string;
    name?: string;
    reason?: string;
  } | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Supabase Connector & App Auth Configuration
  const [authConfig, setAuthConfig] = useState<AppAuthConfig>(() => getAppAuthConfig());
  const [customProjectUrl, setCustomProjectUrl] = useState<string>(() => {
    return authConfig.supabaseCustomUrl || 'https://mjaloptcpeytvecbxbza.supabase.co';
  });
  const [customAnonKey, setCustomAnonKey] = useState<string>(() => {
    return authConfig.supabaseCustomAnonKey || '';
  });
  const [connectorHealth, setConnectorHealth] = useState<SupabaseConnectorHealth | null>(null);
  const [isTestingConnector, setIsTestingConnector] = useState(false);
  const [urlSaveMessage, setUrlSaveMessage] = useState<string | null>(null);

  // First-time login change password states
  const [showPasswordChangeForm, setShowPasswordChangeForm] = useState(false);
  const [pendingUser, setPendingUser] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  // Check Supabase Connector on mount
  useEffect(() => {
    let isMounted = true;
    testSupabaseConnector().then((health) => {
      if (isMounted) setConnectorHealth(health);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Biometrics check
  useEffect(() => {
    isBiometricAvailable().then((avail) => {
      setHasBiometrics(avail);
      if (avail) {
        const profiles = getEnrolledBiometricProfiles();
        setEnrolledCount(profiles.length);
      }
    }).catch(() => setHasBiometrics(false));
  }, []);

  const dialogRef = useAccessibleModal(isOpen, onClose || (() => {}));

  if (!isOpen) return null;

  const handleTestConnector = async (overrideUrl?: string, overrideKey?: string) => {
    setIsTestingConnector(true);
    setUrlSaveMessage(null);
    try {
      const urlToTest = overrideUrl || customProjectUrl;
      const keyToTest = overrideKey !== undefined ? overrideKey : customAnonKey;
      
      const health = await testSupabaseConnector(urlToTest, keyToTest || undefined);
      setConnectorHealth(health);
      triggerHapticFeedback('light');
    } catch {
      // Ignored
    } finally {
      setIsTestingConnector(false);
    }
  };

  const handleSaveAndReconnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlSaveMessage(null);
    const cleanUrl = customProjectUrl.trim();
    if (!cleanUrl.startsWith('http')) {
      setUrlSaveMessage('❌ Please enter a valid URL starting with https://');
      return;
    }
    const updated = saveAppAuthConfig({
      supabaseCustomUrl: cleanUrl,
      supabaseCustomAnonKey: customAnonKey.trim() || undefined,
    });
    setAuthConfig(updated);
    setUrlSaveMessage('✓ Project URL saved & activated! Testing connection...');
    await handleTestConnector(cleanUrl, customAnonKey.trim());
  };

  const handleRoleTabChange = (role: UserRole) => {
    setActiveTab(role);
    setErrorMessage(null);
    if (role === 'super_admin' || role === 'admin') {
      setEmailInput('kpierre24@gmail.com');
      setPasswordInput('password1');
      resetAccountLockout('kpierre24@gmail.com');
      resetAccountLockout('admin');
    } else if (role === 'teacher') {
      const teacher = userCredentials.find(c => c.role === 'teacher');
      setEmailInput(teacher?.email || 'gillian.selkridge@hteim.edu');
      setPasswordInput('password1');
    } else {
      const student = userCredentials.find(c => c.role === 'student');
      setEmailInput(student?.email || 'aburke@student.hteim.edu');
      setPasswordInput('password1');
    }
  };

  // Sign In Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsVerifying(true);

    try {
      const result = await authenticateWithSupabase(emailInput, passwordInput, userCredentials);
      setIsVerifying(false);

      if (result.success && result.user) {
        if (result.mustChangePassword) {
          setPendingUser(result.user);
          setShowPasswordChangeForm(true);
          setNewPassword('');
          setConfirmPassword('');
          setChangeError(null);
        } else {
          const userEmail = (result.user.email || '').toLowerCase().trim();
          const isEnrolled = isBiometricEnrolledForUser(userEmail);
          let isSkipped = false;
          if (userEmail) {
            try {
              isSkipped = sessionStorage.getItem(`hteim_bio_prompt_skipped_${userEmail}`) === 'true';
            } catch {}
          }

          if (hasBiometrics && !isEnrolled && !isSkipped) {
            setPromptBiometricUser(result.user);
          } else {
            onLoginSuccess(result.user);
            if (onClose) onClose();
          }
        }
      } else {
        if (result.isPendingApproval) {
          setStatusResult({
            exists: true,
            status: 'pending',
            name: result.candidateName || emailInput.split('@')[0],
            requestedRole: result.requestedRole || activeTab,
            reason: result.error,
          });
          setLookupIdentifier(emailInput);
          setAuthMode('status');
        } else {
          if (
            result.error &&
            !result.error.toLowerCase().includes('json object') &&
            !result.error.toLowerCase().includes('pgrst') &&
            !result.error.toLowerCase().includes('syntax error')
          ) {
            setErrorMessage(result.error);
          } else {
            const classified = classifyError(new Error(result.error || 'Invalid credentials'), 'authentication');
            setErrorMessage(classified.userMessage);
          }
        }
      }
    } catch (err: any) {
      setIsVerifying(false);
      const appErr = handleError(err, 'LoginModal handleSubmit verification failure', 'authentication');
      setErrorMessage(appErr.userMessage);
    }
  };

  // Biometric login
  const handleBiometricLogin = async () => {
    setIsBiometricBusy(true);
    setErrorMessage(null);
    try {
      const bioResult = await authenticateWithBiometrics(emailInput || null);
      setIsBiometricBusy(false);
      if (bioResult.success && bioResult.profile) {
        const matchingCred = userCredentials.find(
          c => c.email?.toLowerCase() === bioResult.profile?.email.toLowerCase() ||
               c.username?.toLowerCase() === bioResult.profile?.userName.toLowerCase()
        );
        const resolvedUser: AppUser = {
          id: bioResult.profile.userId || matchingCred?.id || `u-${Date.now()}`,
          email: bioResult.profile.email,
          name: bioResult.profile.userName || matchingCred?.name || 'User',
          role: matchingCred?.role || 'student',
          username: matchingCred?.username || bioResult.profile.userName,
          status: 'active',
          mustChangePassword: false,
        };
        onLoginSuccess(resolvedUser);
        if (onClose) onClose();
      } else if (bioResult.error) {
        setErrorMessage(bioResult.error);
      }
    } catch {
      setIsBiometricBusy(false);
      setErrorMessage('Biometric authentication failed. Please enter your password.');
    }
  };

  // Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanName = regFullName.trim();
    const cleanUser = regUsername.trim().toLowerCase();

    if (!cleanName) {
      setRegError('Full Name is required.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setRegError('A valid email address is required.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match. Please re-enter to confirm.');
      return;
    }

    setRegLoading(true);

    try {
      const details: any = {
        phone: regPhone.trim(),
        reason: regReason.trim(),
        username: cleanUser || undefined,
      };
      if (regAccountType === 'student') {
        details.cohortLevel = regCohortLevel;
        details.studentNumber = regStudentNumber.trim();
      } else if (regAccountType === 'teacher') {
        details.department = regDepartment;
      }

      const res = await registerWithSupabaseAuth({
        email: cleanEmail,
        password: regPassword,
        fullName: cleanName,
        username: cleanUser || undefined,
        accountType: regAccountType,
        details,
      });

      setRegLoading(false);

      if (!res.success) {
        setRegError(res.error || 'Registration submission failed. Please try again.');
        return;
      }

      if (res.status === 'approved') {
        setEmailInput(cleanUser || cleanEmail);
        setPasswordInput(regPassword);
        setAuthMode('signin');
        setErrorMessage(null);
        triggerHapticFeedback('success');
        return;
      }

      setLookupIdentifier(cleanEmail);
      setStatusResult({
        exists: true,
        status: 'pending',
        name: cleanName,
        requestedRole: regAccountType,
      });
      setAuthMode('status');
      triggerHapticFeedback('success');
    } catch (err: any) {
      setRegLoading(false);
      setRegError(err.message || 'Registration request encountered an unexpected error.');
    }
  };

  // Lookup Approval Status
  const handleLookupStatus = async () => {
    const clean = lookupIdentifier.trim().toLowerCase();
    if (!clean) return;
    setIsCheckingStatus(true);
    setStatusFeedback(null);

    try {
      const res = await checkAccountApprovalStatus(clean);
      setIsCheckingStatus(false);
      setStatusResult(res);

      if (res.status === 'approved') {
        setStatusFeedback('🎉 Approved! Your account is active in Supabase. You can now sign in.');
      } else if (res.status === 'rejected') {
        setStatusFeedback(`❌ Application not approved: ${res.reason || 'Declined by administrator'}`);
      } else if (res.status === 'pending') {
        setStatusFeedback('⏳ Still awaiting approval in Supabase. An administrator will review your account shortly.');
      } else {
        setStatusFeedback('ℹ️ No registration record found for this identifier in Supabase.');
      }
    } catch {
      setIsCheckingStatus(false);
      setStatusFeedback('Unable to reach Supabase to verify status. Please try again.');
    }
  };

  // Change Password Submit
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError(null);

    const newPass = newPassword.trim();
    const confPass = confirmPassword.trim();

    if (!newPass) {
      setChangeError('Please enter a new password.');
      return;
    }
    if (newPass.length < 6) {
      setChangeError('New password must be at least 6 characters long.');
      return;
    }
    if (['password1', 'password', '1234', '12345'].includes(newPass.toLowerCase())) {
      setChangeError('You cannot use default or simple passwords. Please create a unique, secure password.');
      return;
    }
    if (newPass !== confPass) {
      setChangeError('Passwords do not match. Please re-type to confirm.');
      return;
    }

    if (pendingUser) {
      const userWithoutMustChange: AppUser = {
        ...pendingUser,
        mustChangePassword: false,
      };
      if (onChangePassword) {
        onChangePassword(userWithoutMustChange, newPass);
      }
      try {
        await updatePasswordInSupabase(userWithoutMustChange, newPass, userCredentials || []);
      } catch (err) {
        handleError(err, 'LoginModal - Password cloud update error', 'database');
      }
      onLoginSuccess(userWithoutMustChange);
      setShowPasswordChangeForm(false);
      setPendingUser(null);
      if (onClose) onClose();
    }
  };

  const currentScripture = MINISTRY_SCRIPTURES[scriptureIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn modal-material-scrim">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden transition-all transform animate-scaleUp modal-material-container max-h-[94vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 p-4 sm:p-5 relative flex-shrink-0">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-3">
              <LogoImage 
                alt="HTEIM Logo" 
                className="w-11 h-11 rounded-full border border-slate-200 dark:border-slate-600 object-contain bg-white p-0.5 shadow-xs"
              />
              <div>
                <h2 id="login-modal-title" className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  HTEIM School of Ministry
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Supabase Authentication Engine
                  </span>
                  {/* Connector Health Pill */}
                  <button
                    type="button"
                    onClick={() => setAuthMode('connector')}
                    title="View Supabase connector status & diagnostics"
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                      connectorHealth?.status === 'connected'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : connectorHealth?.status === 'degraded'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${connectorHealth?.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    <span>{connectorHealth ? `${connectorHealth.latencyMs}ms` : 'Connecting...'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          {!showPasswordChangeForm && (
            <div className="mt-3.5 grid grid-cols-4 bg-slate-200/70 dark:bg-slate-900/60 p-1 rounded-xl text-xs font-bold gap-1">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setErrorMessage(null); }}
                className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMode === 'signin'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setRegError(null); }}
                className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMode === 'register'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('status'); setStatusFeedback(null); }}
                className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMode === 'status'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Status</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('connector')}
                className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMode === 'connector'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Connector</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6">
          {/* ========================================================================= */}
          {/* VIEW: FIRST-TIME PASSWORD CHANGE                                          */}
          {/* ========================================================================= */}
          {showPasswordChangeForm ? (
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>Security Notice: Set Your Permanent Password</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  Welcome, <strong>{pendingUser?.name}</strong>. Because this is your initial sign-in, please choose a permanent, secure password to protect your academic records in Supabase.
                </p>
              </div>

              {changeError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{changeError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    New Permanent Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowPasswordChangeForm(false); setPendingUser(null); }}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Save & Complete Sign In
                </button>
              </div>
            </form>
          ) : authMode === 'signin' ? (
            /* ========================================================================= */
            /* VIEW: SIGN IN                                                             */
            /* ========================================================================= */
            <div className="space-y-4">
              {/* Scripture Inspiration Banner */}
              <div className="p-3 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-amber-200/50 dark:border-amber-700/30 rounded-2xl flex items-start gap-2.5">
                <BookMarked className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-white mr-1">&ldquo;{currentScripture.text}&rdquo;</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">— {currentScripture.verse}</span>
                </div>
              </div>

              {/* Role Quick Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  Select Portal Persona
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRoleTabChange('student')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      activeTab === 'student'
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-950 dark:text-indigo-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <GraduationCap className={`w-4 h-4 ${activeTab === 'student' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleTabChange('teacher')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      activeTab === 'teacher'
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-950 dark:text-indigo-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <UserCheck className={`w-4 h-4 ${activeTab === 'teacher' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">Faculty</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleTabChange('admin')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      activeTab === 'admin'
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-950 dark:text-indigo-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <ShieldCheck className={`w-4 h-4 ${activeTab === 'admin' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">Admin</span>
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="flex-1">{errorMessage}</span>
                  </div>
                  {errorMessage.toLowerCase().includes('lock') && (
                    <div className="pt-2 border-t border-rose-200/80 dark:border-rose-800/80 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          resetAccountLockout(emailInput);
                          resetAccountLockout('admin');
                          resetAccountLockout(DEFAULT_ADMIN_EMAIL);
                          setErrorMessage(null);
                          triggerHapticFeedback('success');
                        }}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Unlock Account & Clear Lockout</span>
                      </button>
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                        Click to unlock immediately
                      </span>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address, Username, or Student ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder={
                        activeTab === 'admin'
                          ? 'kpierre24@gmail.com'
                          : activeTab === 'teacher'
                          ? 'gillian.selkridge@hteim.edu'
                          : 'aburke@student.hteim.edu'
                      }
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenResetModal) {
                          onOpenResetModal(emailInput);
                        } else {
                          setShowForgotPassword(true);
                        }
                      }}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-1 flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying with Supabase...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to Portal</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Biometric sign in button if available */}
                  {hasBiometrics && enrolledCount > 0 && (
                    <button
                      type="button"
                      onClick={handleBiometricLogin}
                      disabled={isBiometricBusy}
                      className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Fingerprint className="w-4 h-4 text-indigo-600" />
                      <span>Sign In with Face ID / Fingerprint</span>
                    </button>
                  )}
                </div>
              </form>

              {/* Helpful footer options */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>Need an account?</span>
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setRegError(null); }}
                  className="font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
                >
                  Create Account / Register &rarr;
                </button>
              </div>
            </div>
          ) : authMode === 'register' ? (
            /* ========================================================================= */
            /* VIEW: SIGN UP / REGISTER                                                  */
            /* ========================================================================= */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {!authConfig.allowPublicRegistration ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>Public Registration is Currently Managed</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Direct signups are currently restricted by administrator policy. Please contact Academic Affairs at <strong>info@hteim.edu</strong> for account provisioning.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-3 text-xs">
                    <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Direct Account Registration • Supabase Auth Connector</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      Enter your details below to register your account directly in the Supabase database.
                    </p>
                  </div>

                  {regError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{regError}</span>
                    </div>
                  )}

                  {/* Role Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Account Type / Role
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setRegAccountType('student')}
                        className={`p-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                          regAccountType === 'student'
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-950 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Student
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegAccountType('teacher')}
                        className={`p-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                          regAccountType === 'teacher'
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-950 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Faculty / Teacher
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegAccountType('admin')}
                        className={`p-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                          regAccountType === 'admin'
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-950 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Admin
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={regFullName}
                        onChange={(e) => {
                          setRegFullName(e.target.value);
                          if (!regUsername) {
                            setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '.'));
                          }
                        }}
                        placeholder="e.g. John Doe"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Username (Optional)
                      </label>
                      <input
                        type="text"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="e.g. john.doe"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Phone Number (Optional)
                      </label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+1 868 555 0199"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Password (Min 6 chars) *
                      </label>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Confirm Password *
                      </label>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={regLoading}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {regLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Creating Account in Supabase...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Complete Registration</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          ) : authMode === 'status' ? (
            /* ========================================================================= */
            /* VIEW: APPROVAL STATUS LOOKUP                                              */
            /* ========================================================================= */
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Look Up Account Approval Status in Supabase</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Enter your registered email address or username to verify if your account has been approved by the ministry administration.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={lookupIdentifier}
                    onChange={(e) => setLookupIdentifier(e.target.value)}
                    placeholder="Enter email or username"
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleLookupStatus}
                    disabled={isCheckingStatus || !lookupIdentifier.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isCheckingStatus ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Check</span>
                  </button>
                </div>
              </div>

              {statusResult && (
                <div className="p-4 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Approval State:</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                        statusResult.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200'
                          : statusResult.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200'
                      }`}
                    >
                      {statusResult.status === 'approved' ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Approved
                        </>
                      ) : statusResult.status === 'rejected' ? (
                        <>
                          <X className="w-3.5 h-3.5" /> Rejected
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5" /> Pending Approval
                        </>
                      )}
                    </span>
                  </div>

                  {statusResult.name && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Applicant Name:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{statusResult.name}</span>
                    </div>
                  )}

                  {statusResult.requestedRole && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Requested Role:</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 capitalize">{statusResult.requestedRole}</span>
                    </div>
                  )}

                  {statusResult.status === 'approved' && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEmailInput(lookupIdentifier);
                          setAuthMode('signin');
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Proceed to Sign In &rarr;
                      </button>
                    </div>
                  )}
                </div>
              )}

              {statusFeedback && (
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-center font-medium text-slate-700 dark:text-slate-300">
                  {statusFeedback}
                </div>
              )}
            </div>
          ) : (
            /* ========================================================================= */
            /* VIEW: SUPABASE CONNECTOR & AUTH CONFIGURATION                             */
            /* ========================================================================= */
            <div className="space-y-4">
              {/* Connector Diagnostics Box */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span>Supabase Live Connector Diagnostics</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTestConnector()}
                    disabled={isTestingConnector}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTestingConnector ? 'animate-spin' : ''}`} />
                    <span>{isTestingConnector ? 'Pinging...' : 'Run Ping Test'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-semibold">Auth Service</span>
                    <span className={`font-bold flex items-center gap-1 mt-0.5 ${connectorHealth?.authEndpointOk ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {connectorHealth?.authEndpointOk ? '✓ Operational' : '✗ Unreachable'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-semibold">Database REST API</span>
                    <span className={`font-bold flex items-center gap-1 mt-0.5 ${connectorHealth?.databaseEndpointOk ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {connectorHealth?.databaseEndpointOk ? '✓ Connected' : '✗ Unreachable'}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-mono bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="truncate">Active Endpoint: <strong className="text-indigo-600 dark:text-indigo-400">{connectorHealth?.projectUrl || customProjectUrl}</strong></span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0 ml-2">{connectorHealth?.latencyMs ? `${connectorHealth.latencyMs}ms` : ''}</span>
                </div>
              </div>

              {/* Supabase Endpoint Configuration Form */}
              <form onSubmit={handleSaveAndReconnect} className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3 text-xs">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
                  <Server className="w-4 h-4 text-indigo-600" />
                  <span>Configure Supabase Project Connection</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Supabase Project URL
                    </label>
                    <input
                      type="url"
                      value={customProjectUrl}
                      onChange={(e) => setCustomProjectUrl(e.target.value)}
                      placeholder="https://mjaloptcpeytvecbxbza.supabase.co"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Supabase Anon Key (Optional Override)
                    </label>
                    <input
                      type="password"
                      value={customAnonKey}
                      onChange={(e) => setCustomAnonKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                {urlSaveMessage && (
                  <div className={`p-2 rounded-lg text-xs font-semibold ${urlSaveMessage.startsWith('✓') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {urlSaveMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isTestingConnector}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save URL & Reconnect</span>
                </button>
              </form>

              {/* In-App Auth Policy Configuration */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <span>In-App Auth & Registration Policy</span>
                </div>

                <div className="space-y-2 text-xs">
                  <label className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">Allow Public Registration</span>
                      <span className="text-[10px] text-slate-500">Allow visitors to submit account requests from the login modal.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={authConfig.allowPublicRegistration}
                      onChange={(e) => {
                        const updated = saveAppAuthConfig({ allowPublicRegistration: e.target.checked });
                        setAuthConfig(updated);
                      }}
                      className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">Auto-Approve Students</span>
                      <span className="text-[10px] text-slate-500">Automatically approve student accounts upon signup.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={authConfig.autoApproveStudents}
                      onChange={(e) => {
                        const updated = saveAppAuthConfig({ autoApproveStudents: e.target.checked });
                        setAuthConfig(updated);
                      }}
                      className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                    />
                  </label>

                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white block mb-1">Session Inactivity Timeout</span>
                    <select
                      value={authConfig.sessionTimeoutMinutes}
                      onChange={(e) => {
                        const updated = saveAppAuthConfig({ sessionTimeoutMinutes: Number(e.target.value) });
                        setAuthConfig(updated);
                      }}
                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="15">15 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="60">1 Hour</option>
                      <option value="120">2 Hours (Standard)</option>
                      <option value="0">Never (Stay Signed In)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
          onBackToLogin={() => setShowForgotPassword(false)}
          initialEmail={emailInput}
          userCredentials={userCredentials}
        />
      )}

      {/* Biometric Enroll Prompt */}
      {promptBiometricUser && (
        <BiometricEnrollPromptModal
          isOpen={!!promptBiometricUser}
          onClose={() => {
            const user = promptBiometricUser;
            setPromptBiometricUser(null);
            onLoginSuccess(user);
            if (onClose) onClose();
          }}
          user={promptBiometricUser}
          onEnrollmentSuccess={() => {
            const user = promptBiometricUser;
            setPromptBiometricUser(null);
            onLoginSuccess(user);
            if (onClose) onClose();
          }}
        />
      )}
    </div>
  );
};
