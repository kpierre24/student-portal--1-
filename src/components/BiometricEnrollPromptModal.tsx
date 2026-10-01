import React, { useState } from 'react';
import { Fingerprint, Smartphone, ShieldCheck, CheckCircle2, X, RefreshCw, AlertCircle } from 'lucide-react';
import { registerBiometricCredential, getBiometricPlatformDetails } from '../lib/biometricAuth';
import { triggerHapticFeedback } from '../lib/capacitorBridge';
import { AppUser } from '../lib/userAuth';

interface BiometricEnrollPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser;
  onEnrollmentSuccess?: () => void;
}

export const BiometricEnrollPromptModal: React.FC<BiometricEnrollPromptModalProps> = ({
  isOpen,
  onClose,
  user,
  onEnrollmentSuccess,
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const { platform, biometricLabel, hardwareName } = getBiometricPlatformDetails();

  const handleEnroll = async () => {
    setIsRegistering(true);
    setErrorMessage(null);
    triggerHapticFeedback('medium');

    try {
      const res = await registerBiometricCredential(user.id, user.email, user.name);
      if (res.success) {
        triggerHapticFeedback('success');
        setSuccess(true);
        setTimeout(() => {
          if (onEnrollmentSuccess) onEnrollmentSuccess();
          onClose();
        }, 1200);
      } else {
        triggerHapticFeedback('error');
        setErrorMessage(res.error || 'Could not complete biometric registration.');
      }
    } catch (err: any) {
      triggerHapticFeedback('error');
      setErrorMessage(err.message || 'Biometric registration failed.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSkip = () => {
    try {
      // Remember user chose to skip for this session so we don't nag repeatedly
      sessionStorage.setItem(`hteim_bio_prompt_skipped_${user.email.toLowerCase()}`, 'true');
    } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="biometric-prompt-title"
        className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header Visual */}
        <div className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white text-center relative">
          <button
            type="button"
            onClick={handleSkip}
            className="absolute right-3 top-3 text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Skip biometric enrollment"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center shadow-inner">
            <Fingerprint className="w-8 h-8 text-amber-300 animate-pulse" />
          </div>

          <h3 id="biometric-prompt-title" className="text-lg font-black tracking-tight">
            Enable {biometricLabel}?
          </h3>
          <p className="text-xs text-indigo-100 mt-1 font-medium">
            Fast, secure 1-tap sign in for this {platform === 'android' ? 'Android device' : platform === 'ios' ? 'Apple device' : 'browser'}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {success ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p className="text-xs font-black text-emerald-800 dark:text-emerald-200">
                {biometricLabel} Enabled!
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                You can now log into your portal account using your fingerprint or biometric sensor.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                  <div className="text-[11px]">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Hardware-Backed Security</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Uses your phone's native {hardwareName}. Your biometric data stays strictly on your physical phone and is never sent to any server.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div className="text-[11px]">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Skip Password Entry</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Sign in instantly next time with a single touch or glance.
                    </span>
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleEnroll}
                  disabled={isRegistering}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isRegistering ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Biometric Sensor...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4 text-amber-300" />
                      <span>Activate {biometricLabel}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
