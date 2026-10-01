import React, { useState, useMemo } from 'react';
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
  LogOut,
  BookMarked,
  Fingerprint,
  Eye,
  EyeOff,
  Delete,
  Shield,
  Key,
  CheckCircle2,
  Hash
} from 'lucide-react';
import { AppUser, UserRole, UserCredential, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_NAME } from '../lib/userAuth';
import { loginWithSupabaseAuth as authenticateWithSupabase } from '../services/authService';
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

// Welcoming Scripture Verse Database
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
  },
  {
    verse: "Joshua 1:8",
    text: "This book of the law shall not depart out of thy mouth; but thou shalt meditate therein day and night, that thou mayest observe to do according to all that is written therein: for then thou shalt make thy way prosperous.",
    theme: "Spiritual Meditation"
  }
];

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen = true,
  onClose,
  onLoginSuccess,
  onLogout,
  userCredentials = [],
  onChangePassword,
  currentUser = null,
  onSyncCredentials,
  onOpenResetModal
}) => {
  const [activeTab, setActiveTab] = useState<UserRole>('student');
  const [isVerifying, setIsVerifying] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scriptureIndex, setScriptureIndex] = useState(0);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isBiometricBusy, setIsBiometricBusy] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [promptBiometricUser, setPromptBiometricUser] = useState<AppUser | null>(null);  React.useEffect(() => {
    isBiometricAvailable().then((avail) => {
      const profiles = getEnrolledBiometricProfiles();
      setEnrolledCount(profiles.length);
      setHasBiometrics(avail || profiles.length > 0);
    });
  }, []);
  const handleBiometricLogin = async () => {
    triggerHapticFeedback('medium');
    setIsBiometricBusy(true);
    setErrorMessage(null);

    try {
      const bioRes = await authenticateWithBiometrics(emailInput || undefined);
      if (bioRes.success && bioRes.profile) {
        // Find matching credential safely
        const targetEmail = (bioRes.profile.email || '').toLowerCase().trim();
        const cred = userCredentials.find((c) => {
          if (!c) return false;
          const cEmail = (c.email || '').toLowerCase().trim();
          const cUser = (c.username || '').toLowerCase().trim();
          return (targetEmail && cEmail === targetEmail) || (targetEmail && cUser === targetEmail);
        });

        if (cred) {
          const authUser: AppUser = {
            id: cred.id || bioRes.profile.userId || `user_${Date.now()}`,
            email: cred.email || bioRes.profile.email || 'user@hteim.edu',
            name: cred.name || bioRes.profile.userName || 'HTEIM Member',
            role: cred.role || activeTab,
            username: cred.username,
            studentName: cred.studentName,
            status: cred.status || 'active',
          };
          triggerHapticFeedback('success');
          onLoginSuccess(authUser);
          if (onClose) onClose();
        } else {
          // Fallback to active tab profile or profile name
          const fallbackUser: AppUser = {
            id: bioRes.profile.userId || `user_${Date.now()}`,
            email: bioRes.profile.email || 'user@hteim.edu',
            name: bioRes.profile.userName || 'HTEIM Member',
            role: activeTab,
            status: 'active',
          };
          triggerHapticFeedback('success');
          onLoginSuccess(fallbackUser);
          if (onClose) onClose();
        }
      } else {
        triggerHapticFeedback('error');
        setErrorMessage(bioRes.error || 'Biometric authentication was cancelled.');
      }
    } catch (err: any) {
      triggerHapticFeedback('error');
      setErrorMessage(err.message || 'Biometric login failed');
    } finally {
      setIsBiometricBusy(false);
    }
  };

  // First-time login change password states
  const [showPasswordChangeForm, setShowPasswordChangeForm] = useState(false);
  const [pendingUser, setPendingUser] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeError, setChangeError] = useState<string | null>(null);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  const validateEmailOrUser = (value: string): string | null => {
    if (!value.trim()) return 'Email address is required';
    if (value.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  const validatePassword = (value: string): string | null => {
    if (!value) return 'Password is required';
    if (value.length < 4) return 'Password must be at least 4 characters';
    return null;
  };

  const isLoginFormValid = () => {
    return validateEmailOrUser(emailInput) === null && validatePassword(passwordInput) === null;
  };

  React.useEffect(() => {
    setEmailInput('');
    setPasswordInput('');
    setEmailError(null);
    setPasswordError(null);
  }, [activeTab]);

  const dialogRef = useAccessibleModal(isOpen ?? true, onClose || (() => {}));

  if (!isOpen) return null;

  // Quick tab switch handler
  const handleSelectTab = (tab: UserRole) => {
    setActiveTab(tab);
    setErrorMessage(null);
    setEmailInput(tab === 'admin' ? 'kpierre24@gmail.com' : '');
    setPasswordInput('');
    setShowPasswordChangeForm(false);
    setPendingUser(null);
  };

  // Quick autofill role account
  const handleAutofillDemo = (role: UserRole) => {
    setActiveTab(role);
    setErrorMessage(null);
    if (role === 'admin') {
      setEmailInput('kpierre24@gmail.com');
      setPasswordInput('password1');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsVerifying(true);

    try {
      const result = await authenticateWithSupabase(emailInput, passwordInput, userCredentials);
      setIsVerifying(false);

      if (result.success && result.user) {
        if (result.mustChangePassword) {
          // Enforce change password on first login
          setPendingUser(result.user);
          setShowPasswordChangeForm(true);
          setNewPassword('');
          setConfirmPassword('');
          setChangeError(null);
        } else {
          // Check if device supports biometrics and user hasn't enrolled or skipped this session
          const userEmail = (result.user.email || '').toLowerCase().trim();
          const isEnrolled = isBiometricEnrolledForUser(userEmail);
          let isSkipped = false;
          if (userEmail) {
            try {
              isSkipped = sessionStorage.getItem(`hteim_bio_prompt_skipped_${userEmail}`) === 'true';
            } catch {}
          }

          if (hasBiometrics && !isEnrolled && !isSkipped) {
            // Keep modal open to show biometric enrollment prompt
            setPromptBiometricUser(result.user);
          } else {
            onLoginSuccess(result.user);
            if (onClose) onClose();
          }
        }
      } else {
        const classified = classifyError(new Error(result.error || 'Invalid credentials'), 'authentication');
        setErrorMessage(classified.userMessage);
      }
    } catch (err: any) {
      setIsVerifying(false);
      const appErr = handleError(err, 'LoginModal handleSubmit verification failure', 'authentication');
      setErrorMessage(appErr.userMessage);
    }
  };

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

    if (newPass.toLowerCase() === 'password1' || newPass.toLowerCase() === 'password' || newPass === '1234' || newPass === '12345') {
      setChangeError('You cannot use the default "password1" or simple passwords. Please create a unique, secure password.');
      return;
    }

    if (newPass !== confPass) {
      setChangeError('Passwords do not match. Please re-type to confirm.');
      return;
    }

    if (pendingUser) {
      const userWithoutMustChange: AppUser = {
        ...pendingUser,
        mustChangePassword: false
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

  const nextScripture = () => {
    setScriptureIndex((prev) => (prev + 1) % MINISTRY_SCRIPTURES.length);
  };

  const currentScripture = MINISTRY_SCRIPTURES[scriptureIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn modal-material-scrim">
      <div 
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="HTEIM School of Ministry Portal Authentication"
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden flex flex-col relative my-8 modal-material-dialog"
      >
        
        {/* Header Banner */}
        <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 relative modal-material-header">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3 mb-2">
            <LogoImage 
              alt="HTEIM Logo" 
              className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-600 object-contain bg-white p-0.5"
            />
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">HTEIM School of Ministry</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Portal Authentication & Access Control
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Log in to access your designated view. Administrators, Teachers, and Ministry Students have custom tailored dashboards and permissions.
          </p>
        </div>

        {/* Role Type Tabs (only visible when not in password change mode) */}
        {!showPasswordChangeForm && (
          <div className="grid grid-cols-3 bg-slate-100 dark:bg-slate-800/60 p-1.5 border-b border-slate-200 dark:border-slate-700 gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectTab('student')}
              className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'student'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab('teacher')}
              className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'teacher'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Teacher</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab('admin')}
              className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>
        )}

        {/* Form Body */}
        {showPasswordChangeForm ? (
          <form onSubmit={handleChangePasswordSubmit} className="p-6 space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-bold flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold">First-Time Password Change Required</p>
                <p className="font-medium mt-0.5 text-slate-700 dark:text-slate-300">
                  Welcome, <span className="text-indigo-600 font-bold">{pendingUser?.name}</span>! Set a secure confidential password to proceed.
                </p>
              </div>
            </div>

            {changeError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{changeError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider">
                  New Password (Minimum 6 characters)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      let err = null;
                      if (!e.target.value) err = 'Password is required';
                      else if (e.target.value.length < 6) err = 'Password must be at least 6 characters';
                      else if (e.target.value.toLowerCase() === 'password1' || e.target.value.toLowerCase() === 'password' || e.target.value === '1234' || e.target.value === '12345') err = 'Cannot use default or weak password';
                      setNewPasswordError(err);
                    }}
                    placeholder="Create strong confidential password"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    required
                    autoFocus
                  />
                </div>
                {newPasswordError && <p className="text-[10px] text-rose-600">{newPasswordError}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setConfirmPasswordError(e.target.value !== newPassword ? 'Passwords do not match' : null);
                    }}
                    placeholder="Verify chosen password"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    required
                  />
                </div>
                {confirmPasswordError && <p className="text-[10px] text-rose-600">{confirmPasswordError}</p>}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordChangeForm(false);
                  setPendingUser(null);
                }}
                className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newPassword || !confirmPassword || !!newPasswordError || !!confirmPasswordError}
                className="flex-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                Set Password & Enter Portal
              </button>
            </div>
          </form>
        ) : (
          /* ========================================================================= */
          /* CENTRAL AUTHENTICATION: STUDENT / TEACHER / ADMIN                         */
          /* ========================================================================= */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider flex justify-between">
                <span>User Email Address</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setEmailError(validateEmailOrUser(e.target.value));
                  }}
                  onBlur={() => setEmailError(validateEmailOrUser(emailInput))}
                  placeholder={activeTab === 'admin' ? 'kpierre24@gmail.com' : activeTab === 'teacher' ? 'gillian.selkridge@hteim.edu' : 'aburke@student.hteim.edu'}
                  className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-800 ${emailError ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 dark:border-slate-700'}`}
                  required
                />
              </div>
              {emailError && <p className="text-[10px] text-rose-600">{emailError}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider flex justify-between">
                <span>Password</span>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold hover:underline cursor-pointer lowercase normal-case tracking-normal"
                >
                  Forgot password?
                </button>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError(validatePassword(e.target.value));
                  }}
                  onBlur={() => setPasswordError(validatePassword(passwordInput))}
                  placeholder="••••••••"
                  className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-800 ${passwordError ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 dark:border-slate-700'}`}
                  required
                />
              </div>
              {passwordError && <p className="text-[10px] text-rose-600">{passwordError}</p>}
            </div>

            {/* Quick Auto-Fill Demo Helper */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Quick sign in:</span>
              <button
                type="button"
                onClick={() => handleAutofillDemo(activeTab)}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-bold underline cursor-pointer"
              >
                Auto-fill default {activeTab} login
              </button>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={!isLoginFormValid() || isVerifying}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying Central Registry...</span>
                </>
              ) : (
                <>
                  <span>Log In to {activeTab === 'admin' ? 'Administrator Suite' : activeTab === 'teacher' ? 'Faculty Suite' : 'Student Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Biometric One-Tap Login Button (For Teachers & Students) */}
            {hasBiometrics && (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    if (enrolledCount === 0) {
                      setErrorMessage(`No biometric profile enrolled on this device yet. Log in with your email & password once to enable ${getBiometricPlatformDetails().biometricLabel}.`);
                    } else {
                      await handleBiometricLogin();
                    }
                  }}
                  disabled={isBiometricBusy}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  aria-label={`Sign in with ${getBiometricPlatformDetails().biometricLabel}`}
                >
                  {isBiometricBusy ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                      <span>Scanning Biometrics...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4 text-amber-500" />
                      <span>
                        {enrolledCount > 0 
                          ? `Sign in with ${getBiometricPlatformDetails().biometricLabel}` 
                          : `Enable ${getBiometricPlatformDetails().biometricLabel}`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Quick Role Access Bar */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Quick Sign-In:</span>
              <div className="flex items-center gap-1.5">
                <button 
                  type="button" 
                  onClick={() => handleAutofillDemo('student')}
                  className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300 hover:text-indigo-600 font-bold cursor-pointer"
                >
                  Student
                </button>
                <button 
                  type="button" 
                  onClick={() => handleAutofillDemo('teacher')}
                  className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300 hover:text-indigo-600 font-bold cursor-pointer"
                >
                  Teacher
                </button>
                <button 
                  type="button" 
                  onClick={() => handleAutofillDemo('admin')}
                  className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded text-purple-700 dark:text-purple-300 hover:text-purple-900 font-bold cursor-pointer"
                >
                  Admin
                </button>
              </div>
            </div>

            {/* Scripture Quote Box */}
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl flex items-start gap-2">
              <BookMarked className="w-4 h-4 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[11px] text-amber-950 dark:text-amber-200 font-serif italic leading-snug">
                  "{currentScripture.text}"
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                    — {currentScripture.verse} ({currentScripture.theme})
                  </span>
                  <button
                    type="button"
                    onClick={nextScripture}
                    className="text-[9px] font-bold text-amber-800 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    Next Quote →
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Footer info */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>HTEIM School of Ministry © 2026</span>
          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">Academic Portal</span>
        </div>
      </div>

      {/* Forgot Password Component for All Users */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onBackToLogin={() => setShowForgotPassword(false)}
        userCredentials={userCredentials}
        onOpenResetModal={(email) => {
          setShowForgotPassword(false);
          if (onOpenResetModal) {
            onOpenResetModal(email);
          }
        }}
        onPasswordResetSuccess={(email) => {
          setEmailInput(email);
        }}
      />

      {/* Post-Login Biometric Enrollment Prompt */}
      {promptBiometricUser && (
        <BiometricEnrollPromptModal
          isOpen={!!promptBiometricUser}
          user={promptBiometricUser}
          onClose={() => {
            const user = promptBiometricUser;
            setPromptBiometricUser(null);
            onLoginSuccess(user);
            if (onClose) onClose();
          }}
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
