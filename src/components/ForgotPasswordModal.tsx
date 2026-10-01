import React, { useState, useEffect, useRef } from 'react';
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
  X,
  HelpCircle,
  Timer,
  MailCheck
} from 'lucide-react';
import { UserRole, UserCredential } from '../lib/userAuth';
import { requestPasswordResetForEmail } from '../lib/supabaseAuth';
import { triggerHapticFeedback } from '../lib/capacitorBridge';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
  userCredentials?: UserCredential[];
  onPasswordResetSuccess?: (email: string) => void;
  onOpenResetModal?: (email: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onBackToLogin,
  userCredentials = [],
  onPasswordResetSuccess,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [identifier, setIdentifier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 60-second cooldown to prevent email spam
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldownSeconds(60);
    cooldownRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  if (!isOpen) return null;

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    setIsSuccess(false);
    setIdentifier('');
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHapticFeedback('medium');
    setErrorMessage(null);

    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) {
      setErrorMessage('Please enter your registered account email or username.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await requestPasswordResetForEmail(cleanId, userCredentials);
      setIsSubmitting(false);

      if (res.success) {
        triggerHapticFeedback('success');
        setIsSuccess(true);
        setSuccessMessage(res.message);
        startCooldown();
        if (onPasswordResetSuccess) {
          onPasswordResetSuccess(cleanId);
        }
      } else {
        triggerHapticFeedback('error');
        setErrorMessage(res.message || 'Unable to process password reset.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      triggerHapticFeedback('error');
      setErrorMessage(err.message || 'Failed to dispatch password recovery email.');
    }
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0 || isSubmitting) return;
    setIsSuccess(false);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="HTEIM Account Password Recovery Center"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden flex flex-col relative my-8"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#023264] to-[#011a36] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-300 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <LogoImage 
              alt="HTEIM Logo" 
              className="w-12 h-12 rounded-full border border-sky-400/30 object-contain bg-white p-0.5 shrink-0"
            />
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Security Center
              </span>
              <h2 className="text-lg font-black tracking-tight text-white mt-1">
                Account Password Recovery
              </h2>
            </div>
          </div>
          <p className="text-xs text-sky-100/80 leading-relaxed">
            Reset your HTEIM School of Ministry portal password for Students, Faculty, Administrators, and Bursar Accounts.
          </p>
        </div>

        {/* Role Selection Tabs */}
        {!isSuccess && (
          <div className="grid grid-cols-4 bg-slate-100 dark:bg-slate-800 p-1.5 border-b border-slate-200 dark:border-slate-700 gap-1">
            <button
              type="button"
              onClick={() => handleRoleSelect('student')}
              className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                selectedRole === 'student'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 shrink-0" />
              <span>Student</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('teacher')}
              className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                selectedRole === 'teacher' || selectedRole === 'lecturer'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Faculty</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('admin')}
              className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                selectedRole === 'admin' || selectedRole === 'super_admin'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('finance_officer')}
              className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                selectedRole === 'finance_officer'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Bursar</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="space-y-4">
              {/* Success confirmation */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Recovery Instructions Sent</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {successMessage}
                </p>
              </div>

              {/* Next steps guidance */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Next Steps
                </p>
                <div className="space-y-2">
                  {[
                    { icon: <MailCheck className="w-4 h-4 text-indigo-500 shrink-0" />, text: 'Check your inbox and spam/junk folder for an email from HTEIM.' },
                    { icon: <KeyRound className="w-4 h-4 text-indigo-500 shrink-0" />, text: 'Click the "Reset Password" link in the email — it expires in 60 minutes.' },
                    { icon: <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />, text: 'Set a strong new password. You will be signed in immediately.' },
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                      {step.icon}
                      <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resend / contact info */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                <p className="font-bold mb-0.5">Didn't receive it?</p>
                <p>Check your spam folder or contact your administrator at <span className="font-mono font-bold">info@hteim.edu</span>.</p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-2">
                {/* Resend with cooldown */}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldownSeconds > 0}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {cooldownSeconds > 0 ? (
                    <>
                      <Timer className="w-3.5 h-3.5" />
                      <span>Resend in {cooldownSeconds}s</span>
                    </>
                  ) : (
                    <span>Try Another Email</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider flex justify-between">
                  <span>Registered Account Email or Username</span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold capitalize">
                    {selectedRole.replace('_', ' ')} Role
                  </span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      selectedRole === 'admin' || selectedRole === 'super_admin'
                        ? 'admin@hteim.edu'
                        : selectedRole === 'teacher' || selectedRole === 'lecturer'
                        ? 'faculty@hteim.edu'
                        : selectedRole === 'finance_officer'
                        ? 'bursar@hteim.edu'
                        : 'student@hteim.edu'
                    }
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed space-y-1">
                <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                  How Password Reset Works
                </div>
                <p>
                  A secure reset link will be emailed to your registered address. Click the link in the email to set your new password — no one else can see or use it.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !identifier.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Dispatching Recovery Email...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Send Password Reset Instructions</span>
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Sign In</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>HTEIM School of Ministry © 2026</span>
          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">Secure Auth</span>
        </div>
      </div>
    </div>
  );
};
