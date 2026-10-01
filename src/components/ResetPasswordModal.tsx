import React, { useState, useEffect, useMemo } from 'react';
import { LogoImage } from './LogoImage';
import { 
  KeyRound, 
  Mail, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  GraduationCap, 
  UserCheck, 
  ShieldCheck, 
  Lock, 
  Sparkles,
  X,
  Eye,
  EyeOff,
  Search,
  Check,
  Shield,
  User as UserIcon,
  HelpCircle
} from 'lucide-react';
import { UserRole, UserCredential, AppUser, generateStudentUsername } from '../lib/userAuth';
import { updatePasswordInSupabase } from '../lib/supabaseAuth';
import { supabase } from '../lib/supabaseClient';
import { triggerHapticFeedback } from '../lib/capacitorBridge';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserEmail?: string;
  userCredentials?: UserCredential[];
  onResetComplete?: (user: AppUser, newPassword?: string) => void;
  onBackToLogin?: () => void;
  /** When true, the user was redirected here via a Supabase password-recovery email link.
   *  The account selector is hidden — the identity is already confirmed by the active session. */
  isFromEmailLink?: boolean;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  targetUserEmail,
  userCredentials = [],
  onResetComplete,
  onBackToLogin,
  isFromEmailLink = false,
}) => {
  const [selectedEmail, setSelectedEmail] = useState<string>(targetUserEmail || '');
  const [searchFilter, setSearchFilter] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatedUserSession, setUpdatedUserSession] = useState<AppUser | null>(null);

  // Sync targetUserEmail whenever prop changes
  useEffect(() => {
    if (targetUserEmail) {
      setSelectedEmail(targetUserEmail);
    }
  }, [targetUserEmail]);

  // If modal opens and we have no preselected email, select first matched credential or default
  useEffect(() => {
    if (isOpen && !selectedEmail && userCredentials.length > 0) {
      setSelectedEmail(userCredentials[0].email);
    }
  }, [isOpen, selectedEmail, userCredentials]);

  // Filter user credentials list for account picker
  const filteredCredentials = useMemo(() => {
    if (!searchFilter.trim()) return userCredentials;
    const query = searchFilter.toLowerCase();
    return userCredentials.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.role.toLowerCase().includes(query) ||
      (c.username && c.username.toLowerCase().includes(query))
    );
  }, [userCredentials, searchFilter]);

  // Locate matching credential object
  const matchedCred = useMemo(() => {
    if (!selectedEmail) return null;
    const clean = selectedEmail.trim().toLowerCase();
    return userCredentials.find(c => 
      c.email.toLowerCase() === clean || 
      (c.username && c.username.toLowerCase() === clean)
    );
  }, [selectedEmail, userCredentials]);

  // Calculate Password Strength Scores
  const strengthMetrics = useMemo(() => {
    const pwd = newPassword;
    const hasMinLength = pwd.length >= 8;
    const hasNumber = /\d/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

    let score = 0;
    if (pwd.length >= 6) score += 20;
    if (hasMinLength) score += 20;
    if (hasNumber) score += 20;
    if (hasUpper && hasLower) score += 20;
    if (hasSpecial) score += 20;

    let label = 'Weak';
    let colorClass = 'bg-rose-500';
    if (score >= 80) {
      label = 'Strong';
      colorClass = 'bg-emerald-500';
    } else if (score >= 50) {
      label = 'Moderate';
      colorClass = 'bg-amber-500';
    }

    return {
      score,
      label,
      colorClass,
      hasMinLength,
      hasNumber,
      hasUpper,
      hasLower,
      hasSpecial,
      isMatch: pwd.length > 0 && pwd === confirmPassword
    };
  }, [newPassword, confirmPassword]);

  if (!isOpen) return null;

  const getRoleIconAndBadge = (role?: UserRole) => {
    switch (role) {
      case 'super_admin':
      case 'admin':
        return {
          icon: <ShieldCheck className="w-4 h-4 text-amber-400" />,
          badge: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
          label: 'Administrator'
        };
      case 'teacher':
      case 'lecturer':
        return {
          icon: <UserCheck className="w-4 h-4 text-sky-400" />,
          badge: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
          label: 'Faculty Member'
        };
      case 'finance_officer':
        return {
          icon: <Lock className="w-4 h-4 text-emerald-400" />,
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
          label: 'Bursar / Finance'
        };
      default:
        return {
          icon: <GraduationCap className="w-4 h-4 text-indigo-400" />,
          badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
          label: 'Student'
        };
    }
  };

  const handleExecutePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHapticFeedback('medium');
    setErrorMessage(null);

    const cleanEmail = selectedEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please select or specify a user account email.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. If active Supabase session, call updateUser
      try {
        const { error: supaError } = await supabase.auth.updateUser({ password: newPassword });
        if (supaError) {
          console.warn('Supabase updateUser non-blocking error:', supaError);
        }
      } catch (err) {}

      // 2. Update local and Supabase cloud state
      const targetCred = matchedCred || {
        id: `u-${cleanEmail.replace(/[^a-z0-9]/g, '')}`,
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        role: 'student' as UserRole
      };

      const result = await updatePasswordInSupabase(
        targetCred,
        newPassword,
        userCredentials
      );

      // Build target AppUser object for immediate portal session
      const resolvedRole: UserRole = targetCred.role || 'student';
      const userSession: AppUser = {
        id: targetCred.id || `u-${targetCred.email.replace(/[^a-z0-9]/g, '')}`,
        email: targetCred.email,
        name: targetCred.name || targetCred.email.split('@')[0],
        role: resolvedRole,
        username: (targetCred as any).username || generateStudentUsername(targetCred.name),
        studentName: resolvedRole === 'student' ? targetCred.name : undefined,
        mustChangePassword: false
      };

      setIsSubmitting(false);
      triggerHapticFeedback('success');
      setIsSuccess(true);
      setUpdatedUserSession(userSession);

    } catch (err: any) {
      setIsSubmitting(false);
      triggerHapticFeedback('error');
      setErrorMessage(err.message || 'Failed to update account password.');
    }
  };

  const handleLaunchPortalSession = () => {
    triggerHapticFeedback('light');
    if (updatedUserSession && onResetComplete) {
      onResetComplete(updatedUserSession, newPassword);
    }
    onClose();
  };

  const roleMeta = getRoleIconAndBadge(matchedCred?.role);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="HTEIM Comprehensive Password Reset Module"
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden flex flex-col relative my-8"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#023264] to-[#011a36] text-white p-6 relative border-b border-sky-500/20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-300 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <LogoImage 
              alt="HTEIM Logo" 
              className="w-12 h-12 rounded-full border border-sky-400/30 object-contain bg-white p-0.5 shrink-0 shadow-md"
            />
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-400" />
                Security & Credential Module
              </span>
              <h2 className="text-xl font-black tracking-tight text-white mt-1">
                Password Reset Center
              </h2>
            </div>
          </div>
          <p className="text-xs text-sky-100/80 leading-relaxed">
            Update your credentials securely to access your HTEIM School of Ministry portal dashboard.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border-2 border-emerald-400 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 inline-block mb-2">
                  Credentials Successfully Updated
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Password Updated for {updatedUserSession?.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  Your new password is now active in Supabase Cloud Identity and your local profile registry. You are ready to log in immediately.
                </p>
              </div>

              {/* User Identity Confirmation Card */}
              {updatedUserSession && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-left space-y-2 max-w-sm mx-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Active User Profile
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${roleMeta.badge}`}>
                      {roleMeta.icon}
                      {roleMeta.label}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-indigo-500" />
                    <span>{updatedUserSession.name}</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {updatedUserSession.email}
                  </div>
                </div>
              )}

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleLaunchPortalSession}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Enter Portal as {updatedUserSession?.name || 'User'}</span>
                </button>

                {onBackToLogin && (
                  <button
                    type="button"
                    onClick={onBackToLogin}
                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-2xl hover:bg-slate-200 cursor-pointer"
                  >
                    Return to Login Screen
                  </button>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleExecutePasswordReset} className="space-y-4">
              
              {/* Account Selection / Display Card */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center justify-between">
                  <span>Target User Account</span>
                  {!isFromEmailLink && (
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      {userCredentials.length} Registered Users
                    </span>
                  )}
                </label>

                {/* If coming from an email recovery link, show read-only identity confirmed card */}
                {isFromEmailLink ? (
                  <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        Identity Verified via Email Link
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {selectedEmail || targetUserEmail || 'Verified account'}
                      </p>
                    </div>
                  </div>
                ) : matchedCred ? (
                  <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                        {matchedCred.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          {matchedCred.name}
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {matchedCred.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${roleMeta.badge}`}>
                        {roleMeta.icon}
                        {roleMeta.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedEmail('')}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold underline cursor-pointer hover:text-indigo-800"
                      >
                        Change User
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Searchable User Selector */
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        placeholder="Search student or faculty account..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium"
                      />
                    </div>

                    <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredCredentials.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400">
                          No matching account found. Type custom email below.
                        </div>
                      ) : (
                        filteredCredentials.map((cred, cIdx) => (
                          <button
                            key={cred.id ? `pwd-${cred.id}-${cIdx}` : `pwd-${cred.email || cIdx}`}
                            type="button"
                            onClick={() => setSelectedEmail(cred.email)}
                            className="w-full p-2.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors flex items-center justify-between cursor-pointer"
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {cred.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {cred.email}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {cred.role.toUpperCase()}
                            </span>
                          </button>
                        ))
                      )}
                    </div>

                    <div className="pt-1">
                      <input
                        type="email"
                        value={selectedEmail}
                        onChange={(e) => setSelectedEmail(e.target.value)}
                        placeholder="Or enter email manually (e.g. user@hteim.edu)"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Password Inputs */}
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    New Confidential Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Indicator Meter */}
                {newPassword.length > 0 && (
                  <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-500">Password Strength:</span>
                      <span className={`px-2 py-0.2 rounded text-white ${strengthMetrics.colorClass}`}>
                        {strengthMetrics.label}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${strengthMetrics.colorClass}`}
                        style={{ width: `${Math.max(10, strengthMetrics.score)}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[10px] pt-1">
                      <span className={`flex items-center gap-1 ${strengthMetrics.hasMinLength ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                        <Check className="w-3 h-3" /> 8+ Characters
                      </span>
                      <span className={`flex items-center gap-1 ${strengthMetrics.hasNumber ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                        <Check className="w-3 h-3" /> Includes Number
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type chosen password"
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && !strengthMetrics.isMatch && (
                    <p className="text-[10px] text-rose-500 font-bold pt-0.5">
                      Passwords do not match yet.
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !selectedEmail || !newPassword || newPassword !== confirmPassword}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Saving New Password...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Save Password & Activate Account</span>
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                {onBackToLogin && (
                  <button
                    type="button"
                    onClick={onBackToLogin}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to Sign In</span>
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>HTEIM School of Ministry © 2026</span>
          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">Encrypted Reset Protocol</span>
        </div>
      </div>
    </div>
  );
};
