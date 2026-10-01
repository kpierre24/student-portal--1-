import React, { useState } from 'react';
import { useAccessibleModal } from '../lib/useAccessibleModal';
import { LogoImage } from './LogoImage';
import { 
  Settings, 
  X, 
  Sliders, 
  Zap, 
  Moon, 
  Sun, 
  Monitor, 
  Info, 
  GraduationCap, 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  Bell, 
  BookOpen, 
  Check, 
  ShieldCheck, 
  Mail, 
  ExternalLink,
  Sparkles,
  HelpCircle,
  FileText,
  Building2,
  UserCheck,
  Code2,
  Smartphone,
  Lock,
  ShieldAlert,
  DollarSign,
  AlertCircle,
  UploadCloud,
  Fingerprint
} from 'lucide-react';
import { migrateLocalStorageProfilePicturesToSupabase } from '../lib/supabaseClient';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';
import { registerBiometricCredential, isBiometricAvailable, getEnrolledBiometricProfiles, removeBiometricCredential, isBiometricEnrolledForUser } from '../lib/biometricAuth';
import { triggerHapticFeedback } from '../lib/capacitorBridge';

export type ThemeMode = 'light' | 'dark' | 'system' | 'high-contrast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: 'admin' | 'teacher' | 'student' | string;
  atRiskThreshold: number;
  setAtRiskThreshold: (val: number) => void;
  satisfactoryThreshold: number;
  setSatisfactoryThreshold: (val: number) => void;
  autoSyncInterval: number;
  setAutoSyncInterval: (val: number) => void;
  syncOnTabFocus: boolean;
  setSyncOnTabFocus: (val: boolean) => void;
  sheetMergePolicy: 'sheets' | 'manual' | 'prompt';
  setSheetMergePolicy: (val: 'sheets' | 'manual' | 'prompt') => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  onResetAllData?: () => void;
  onExportBackup?: () => void;
  onImportBackup?: (jsonData: string) => boolean;
  onOpenGuide?: () => void;
  onOpenMobileDownloadCenter?: () => void;
  onOpenAdminTools?: () => void;
  onOpenCohortManager?: () => void;
  onPhotosMigrated?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  userRole = 'admin',
  atRiskThreshold,
  setAtRiskThreshold,
  satisfactoryThreshold,
  setSatisfactoryThreshold,
  autoSyncInterval,
  setAutoSyncInterval,
  syncOnTabFocus,
  setSyncOnTabFocus,
  sheetMergePolicy,
  setSheetMergePolicy,
  themeMode,
  setThemeMode,
  onResetAllData,
  onExportBackup,
  onImportBackup,
  onOpenGuide,
  onOpenMobileDownloadCenter,
  onOpenAdminTools,
  onOpenCohortManager,
  onPhotosMigrated
}) => {
  const dialogRef = useAccessibleModal(isOpen, onClose);
  const [activeTab, setActiveTab] = useState<'appearance' | 'sync' | 'about'>('appearance');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importErrorMessage, setImportErrorMessage] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isMigratingPhotos, setIsMigratingPhotos] = useState(false);
  const [photoMigrationStatus, setPhotoMigrationStatus] = useState<string | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isEnrollingBiometrics, setIsEnrollingBiometrics] = useState(false);
  const [biometricEnrollStatus, setBiometricEnrollStatus] = useState<string | null>(null);

  const handleEnrollBiometrics = async () => {
    triggerHapticFeedback('medium');
    setIsEnrollingBiometrics(true);
    setBiometricEnrollStatus(null);
    try {
      let activeEmail = 'user@hteim.edu';
      let activeName = 'HTEIM User';
      let activeId = 'current_user';

      try {
        const storedUser = localStorage.getItem('hteim_current_user') || localStorage.getItem('hteim_last_auth_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed && typeof parsed === 'object') {
            if (parsed.email) activeEmail = String(parsed.email).trim();
            if (parsed.name || parsed.studentName) activeName = String(parsed.name || parsed.studentName).trim();
            if (parsed.id) activeId = String(parsed.id).trim();
          }
        }
      } catch {}

      const res = await registerBiometricCredential(activeId, activeEmail, activeName);
      if (res.success) {
        triggerHapticFeedback('success');
        setBiometricEnrollStatus('Fingerprint / Face ID successfully linked to this device!');
      } else {
        triggerHapticFeedback('error');
        setBiometricEnrollStatus(res.error || 'Biometric enrollment failed.');
      }
    } catch (e: any) {
      triggerHapticFeedback('error');
      setBiometricEnrollStatus(e.message || 'Enrollment error');
    } finally {
      setIsEnrollingBiometrics(false);
    }
  };

  const handleUnlinkBiometrics = () => {
    triggerHapticFeedback('medium');
    let activeEmail = 'user@hteim.edu';
    try {
      const storedUser = localStorage.getItem('hteim_current_user') || localStorage.getItem('hteim_last_auth_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.email) activeEmail = String(parsed.email).trim();
      }
    } catch {}

    removeBiometricCredential(activeEmail);
    setBiometricEnrollStatus('Biometrics unlinked for this user on this device.');
  };

  const [instAddressError, setInstAddressError] = useState<string | null>(null);
  const [instPhoneError, setInstPhoneError] = useState<string | null>(null);
  const [instEmailError, setInstEmailError] = useState<string | null>(null);
  const [authorizedSignatureError, setAuthorizedSignatureError] = useState<string | null>(null);

  const validateEmail = (value: string): string | null => {
    if (!value.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
    return null;
  };

  const validatePhone = (value: string): string | null => {
    if (!value.trim()) return 'Phone number is required';
    if (!/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/.test(value.trim())) return 'Please enter a valid phone number';
    return null;
  };

  // Expanded Recommended Settings States
  const [passingScore, setPassingScore] = useState<number>(() => {
    const saved = localStorage.getItem('hteim_passing_score');
    return saved ? parseInt(saved, 10) : 70;
  });
  const [creditHoursDefault, setCreditHoursDefault] = useState<number>(() => {
    const saved = localStorage.getItem('hteim_credit_hours_default');
    return saved ? parseInt(saved, 10) : 3;
  });
  const [tuitionPerCredit, setTuitionPerCredit] = useState<number>(() => {
    const saved = localStorage.getItem('hteim_tuition_per_credit');
    return saved ? parseInt(saved, 10) : 150;
  });
  const [defaultTuitionAmount, setDefaultTuitionAmount] = useState<number>(() => {
    const saved = localStorage.getItem('hteim_default_tuition_amount');
    return saved ? parseInt(saved, 10) : 1500;
  });
  const [lateFeeAmount, setLateFeeAmount] = useState<number>(() => {
    const saved = localStorage.getItem('hteim_late_fee_amount');
    return saved ? parseInt(saved, 10) : 50;
  });
  const [installmentPlanTerm, setInstallmentPlanTerm] = useState<number>(() => {
    const saved = localStorage.getItem('hteim_installment_plan_term');
    return saved ? parseInt(saved, 10) : 3;
  });
  const [instAddress, setInstAddress] = useState<string>(() => {
    return localStorage.getItem('hteim_inst_address') || '124 Ministry Lane, NY 10001';
  });
  const [instPhone, setInstPhone] = useState<string>(() => {
    return localStorage.getItem('hteim_inst_phone') || '+1 (555) 777-1212';
  });
  const [instEmail, setInstEmail] = useState<string>(() => {
    return localStorage.getItem('hteim_inst_email') || 'schoolofministry@hteim.org';
  });
  const [authorizedSignature, setAuthorizedSignature] = useState<string>(() => {
    return localStorage.getItem('hteim_authorized_signature') || 'Apostle Kendell Pierre';
  });
  const [allowStudentAttendanceSelfReport, setAllowStudentAttendanceSelfReport] = useState<boolean>(() => {
    return localStorage.getItem('hteim_allow_student_attendance_self_report') === 'true';
  });
  const [enableStripePlaygroundMode, setEnableStripePlaygroundMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('hteim_enable_stripe_playground_mode');
    return saved !== 'false'; // defaults to true
  });
  const [developerMode, setDeveloperMode] = useState<boolean>(() => {
    return localStorage.getItem('hteim_developer_mode') === 'true';
  });

  // Save changes to localStorage automatically only if user is an admin
  React.useEffect(() => {
    if (userRole !== 'admin') return;

    localStorage.setItem('hteim_passing_score', passingScore.toString());
    localStorage.setItem('hteim_credit_hours_default', creditHoursDefault.toString());
    localStorage.setItem('hteim_tuition_per_credit', tuitionPerCredit.toString());
    localStorage.setItem('hteim_default_tuition_amount', defaultTuitionAmount.toString());
    localStorage.setItem('hteim_late_fee_amount', lateFeeAmount.toString());
    localStorage.setItem('hteim_installment_plan_term', installmentPlanTerm.toString());
    localStorage.setItem('hteim_inst_address', instAddress);
    localStorage.setItem('hteim_inst_phone', instPhone);
    localStorage.setItem('hteim_inst_email', instEmail);
    localStorage.setItem('hteim_authorized_signature', authorizedSignature);
    localStorage.setItem('hteim_allow_student_attendance_self_report', allowStudentAttendanceSelfReport.toString());
    localStorage.setItem('hteim_enable_stripe_playground_mode', enableStripePlaygroundMode.toString());
    localStorage.setItem('hteim_developer_mode', developerMode.toString());

    // Dispatch custom event to notify rest of app when critical settings change
    window.dispatchEvent(new CustomEvent('hteim_settings_changed', {
      detail: {
        allowStudentAttendanceSelfReport,
        enableStripePlaygroundMode,
        developerMode,
        passingScore,
        defaultTuitionAmount
      }
    }));
  }, [
    userRole,
    passingScore,
    creditHoursDefault,
    tuitionPerCredit,
    defaultTuitionAmount,
    lateFeeAmount,
    installmentPlanTerm,
    instAddress,
    instPhone,
    instEmail,
    authorizedSignature,
    allowStudentAttendanceSelfReport,
    enableStripePlaygroundMode,
    developerMode
  ]);

  if (!isOpen) return null;

  const isAdmin = userRole === 'admin';
  const isStudent = userRole === 'student';
  const isLocked = !isAdmin;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        if (onImportBackup) {
          const success = onImportBackup(content);
          if (success) {
            setImportStatus('success');
            setTimeout(() => setImportStatus('idle'), 3000);
          } else {
            setImportStatus('error');
            setImportErrorMessage('Invalid backup file structure.');
          }
        }
      } catch (err) {
        setImportStatus('error');
        setImportErrorMessage('Failed to parse JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden modal-material-scrim">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp modal-material-dialog">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0 border-b border-slate-800 modal-material-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Settings className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="settings-modal-title" className="text-sm font-black tracking-tight">Portal Settings & System Information</h2>
                {userRole === 'admin' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Administrator
                  </span>
                )}
                {userRole === 'teacher' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Instructor
                  </span>
                )}
                {isStudent && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Student Account
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">Configure app preferences, sync & institutional profile</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
           aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center justify-around bg-slate-100 p-1.5 border-b border-slate-200 text-xs font-extrabold flex-shrink-0">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'appearance'
                ? 'bg-white text-indigo-700 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Appearance</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('sync')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'sync'
                  ? 'bg-white text-amber-700 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Sync & Backup</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'about'
                ? 'bg-white text-purple-700 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>About HTEIM</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-5 text-xs text-slate-700 bg-white">
          
          {/* Read-Only Notice for Non-Admins */}
          {!isAdmin && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 font-medium">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Settings can only be changed by an Administrator. Read-only permissions active for {userRole ? `${userRole}s` : 'guests'}.</span>
              </div>
              <span className="text-[10px] font-mono uppercase bg-amber-200/80 px-2 py-0.5 rounded font-bold text-amber-900 shrink-0">
                Admin Locked
              </span>
            </div>
          )}

          {/* 1. APPEARANCE & THEME TAB */}
          {activeTab === 'appearance' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-extrabold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5 text-[11px]">
                  <Sun className="w-4 h-4 text-amber-500" />
                  Color Theme & Visual Mode
                </h3>
                <p className="text-[11px] text-slate-500 mb-3">
                  Choose your preferred workspace display aesthetic for late-night grading or daytime instruction.
                </p>

                <div className="grid grid-cols-3 gap-3">
                  {/* Light Mode */}
                  <button
                    onClick={() => setThemeMode('light')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      themeMode === 'light'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Sun className="w-5 h-5 text-amber-500" />
                      {themeMode === 'light' && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900">Light Mode</h4>
                      <p className="text-[10px] text-slate-500">Standard crisp classroom theme</p>
                    </div>
                  </button>

                  {/* Dark Mode */}
                  <button
                    onClick={() => setThemeMode('dark')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      themeMode === 'dark'
                        ? 'border-indigo-600 bg-slate-900 text-white ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Moon className="w-5 h-5 text-indigo-400" />
                      {themeMode === 'dark' && <Check className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <div>
                      <h4 className={`font-extrabold ${themeMode === 'dark' ? 'text-white' : 'text-slate-900'}`}>Dark Mode</h4>
                      <p className={`text-[10px] ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Eye-safe dark slate contrast</p>
                    </div>
                  </button>

                  {/* System Default */}
                  <button
                    onClick={() => setThemeMode('system')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      themeMode === 'system'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Monitor className="w-5 h-5 text-slate-600" />
                      {themeMode === 'system' && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900">System Auto</h4>
                      <p className="text-[10px] text-slate-500">Sync with OS preferences</p>
                    </div>
                  </button>

                  {/* High-Contrast Academic Mode */}
                  <button
                    onClick={() => setThemeMode('high-contrast')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 col-span-3 sm:col-span-1 ${
                      themeMode === 'high-contrast'
                        ? 'border-amber-400 bg-black text-amber-300 ring-2 ring-amber-400/50'
                        : 'border-slate-200 bg-slate-900 text-white hover:bg-black'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <ShieldCheck className="w-5 h-5 text-amber-400" />
                      {themeMode === 'high-contrast' && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white">High Contrast</h4>
                      <p className="text-[10px] text-amber-200">Accessibility compliant mode</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Mobile, Push Notifications & Biometrics (Phase 9) */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 text-[11px]">
                  <Smartphone className="w-4 h-4 text-sky-500" />
                  Mobile & Push Notifications
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Push Notifications Configuration */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Bell className="w-4 h-4 text-amber-500" />
                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Push Notifications</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        Receive instant alerts for assignment deadlines, released grades, and 30-min class countdowns.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsNotificationModalOpen(true)}
                      className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Configure Alerts
                    </button>
                  </div>

                  {/* Biometric Security Enrollment */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Fingerprint className="w-4 h-4 text-emerald-500" />
                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Biometric Login</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        Register this device's Face ID or Fingerprint scanner for passwordless one-tap sign in.
                      </p>
                    </div>

                    {biometricEnrollStatus ? (
                      <div className="space-y-2">
                        <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-1.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                          {biometricEnrollStatus}
                        </div>
                        <button
                          type="button"
                          onClick={handleUnlinkBiometrics}
                          className="w-full py-1 px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          Unlink Biometrics from Device
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={handleEnrollBiometrics}
                          disabled={isEnrollingBiometrics}
                          className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors disabled:opacity-60"
                        >
                          <Fingerprint className="w-3.5 h-3.5" />
                          {isEnrollingBiometrics ? 'Enrolling...' : 'Link Fingerprint / Face ID'}
                        </button>
                        <button
                          type="button"
                          onClick={handleUnlinkBiometrics}
                          className="w-full py-1 px-2 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          Remove Existing Device Biometrics
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview Banner */}
              <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-slate-800 text-xs">High-Contrast Accessibility Styling Enabled</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">WCAG 2.1 Compliant</span>
              </div>
            </div>
          )}

          {/* 3. SYNC & BACKUP TAB */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              {/* Course Credits & Operations Controls */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <h3 className="font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 text-[11px]">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  Academic Policies & Operations Controls
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Course Credit Hours Default</label>
                    <select
                      disabled={isLocked}
                      value={creditHoursDefault}
                      onChange={(e) => setCreditHoursDefault(parseInt(e.target.value, 10))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value={1}>1 Credit Hour</option>
                      <option value={2}>2 Credit Hours</option>
                      <option value={3}>3 Credit Hours (Standard)</option>
                      <option value={4}>4 Credit Hours</option>
                      <option value={6}>6 Credit Hours (Double Module)</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-0.5">Used for calculating GPA index and student graduation progress.</p>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className={`flex items-start gap-2.5 font-bold text-slate-700 ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                      <input 
                        type="checkbox"
                        disabled={isLocked}
                        checked={allowStudentAttendanceSelfReport}
                        onChange={(e) => setAllowStudentAttendanceSelfReport(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                      />
                      <div>
                        <span className="text-xs">Allow Student Self-Reporting</span>
                        <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                          Students can mark presence for active lecture sessions.
                        </p>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 font-bold text-slate-700 ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                      <input 
                        type="checkbox"
                        disabled={isLocked}
                        checked={developerMode}
                        onChange={(e) => setDeveloperMode(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                      />
                      <div>
                        <span className="text-xs">Developer Diagnostic Mode</span>
                        <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                          Exposes raw payload sizes and developer utilities.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {isStudent ? (
                <div className="p-6 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-4 text-center shadow-xl">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
                    <ShieldAlert className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Access Restricted (RBAC)
                    </span>
                    <h4 className="text-base font-black text-white mt-1">
                      Administrative Backup & Synchronization Suite
                    </h4>
                    <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                      Google Sheets auto-sync, raw JSON database exports, file restorations, and database resets are reserved exclusively for Administrators and Instructors.
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/80 text-left text-xs max-w-md mx-auto space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Your Session Account:</span>
                      <span className="font-bold text-blue-400 font-mono">Student Role</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Permission Policy:</span>
                      <span className="font-bold text-rose-400 font-mono">Denied (Standard Student)</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-700/80 pt-2 text-[11px] text-slate-400">
                      <span>Need assistance?</span>
                      <span className="text-slate-300">Contact Portal Administrator</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="font-extrabold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5 text-[11px]">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Google Sheets Auto-Sync Settings
                    </h3>

                    <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Automatic Refresh Frequency</label>
                        <select
                          value={autoSyncInterval}
                          onChange={(e) => setAutoSyncInterval(parseInt(e.target.value, 10))}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value={0}>Manual Refresh Only</option>
                          <option value={300}>Auto-refresh every 5 minutes</option>
                          <option value={600}>Auto-refresh every 10 minutes</option>
                        </select>
                      </div>

                      <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer pt-1">
                        <input 
                          type="checkbox"
                          checked={syncOnTabFocus}
                          onChange={(e) => setSyncOnTabFocus(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Auto-sync attendance data when switching browser tabs</span>
                      </label>

                      {/* Google Sheets Sync Merge Policy */}
                      <div className="border-t border-slate-200 pt-3 mt-1">
                        <label className="block font-bold text-slate-700 mb-1">Sheets Sync Conflict Merge Policy</label>
                        <select
                          value={sheetMergePolicy}
                          onChange={(e) => setSheetMergePolicy(e.target.value as any)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="sheets">Always Prefer Google Sheets (Overwrite Local Overrides)</option>
                          <option value="manual">Always Prefer Local Manual Overrides</option>
                          <option value="prompt">Prompt with Conflict Resolution Modal</option>
                        </select>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                          Decides what happens when attendance data imported from Google Sheets differs from manual edits you made inside the portal.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Financial & Tuition Policy Configuration */}
                  <div>
                    <h3 className="font-extrabold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5 text-[11px]">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Tuition & Financial Policy Setup
                    </h3>

                    <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Base Tuition */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Base Course Tuition ($)</label>
                          <input
                            type="number"
                            min="0"
                            max="10000"
                            step="50"
                            value={defaultTuitionAmount}
                            onChange={(e) => setDefaultTuitionAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                          <p className="text-[10px] text-slate-400 mt-0.5">Standard flat module rate for new payment ledger creation.</p>
                        </div>

                        {/* Tuition per Credit */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Rate per Credit Hour ($)</label>
                          <input
                            type="number"
                            min="0"
                            max="2000"
                            step="10"
                            value={tuitionPerCredit}
                            onChange={(e) => setTuitionPerCredit(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                          <p className="text-[10px] text-slate-400 mt-0.5">Used for calculating pro-rated single-session course audits.</p>
                        </div>

                        {/* Installment Plan Term */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Max Installment Terms</label>
                          <select
                            value={installmentPlanTerm}
                            onChange={(e) => setInstallmentPlanTerm(parseInt(e.target.value, 10))}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value={1}>Single Lump Sum Only</option>
                            <option value={2}>2 Installments Split</option>
                            <option value={3}>3 Installments Split (Standard)</option>
                            <option value={4}>4 Installments Split</option>
                            <option value={6}>6 Installments Split (Extended)</option>
                          </select>
                          <p className="text-[10px] text-slate-400 mt-0.5">Maximum payment segments permitted on student payment accounts.</p>
                        </div>

                        {/* Late Fee Amount */}
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Overdue Late Fee Amount ($)</label>
                          <input
                            type="number"
                            min="0"
                            max="500"
                            step="5"
                            value={lateFeeAmount}
                            onChange={(e) => setLateFeeAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                          <p className="text-[10px] text-slate-400 mt-0.5">Flat penalty applied when bulk triggering overdue penalties.</p>
                        </div>
                      </div>

                      <hr className="border-slate-200" />

                      {/* Mock Stripe Toggle */}
                      <label className="flex items-start gap-2.5 font-bold text-slate-700 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={enableStripePlaygroundMode}
                          onChange={(e) => setEnableStripePlaygroundMode(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                        />
                        <div>
                          <span>Enable Simulated Stripe Checkout Sandbox</span>
                          <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                            If enabled, students accessing the payment portal will check out using a simulated sandbox visual interface. Disabling this switches payments to administrative reporting only.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Data Backup & Restore */}
                  <div>
                    <h3 className="font-extrabold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5 text-[11px]">
                      <Database className="w-4 h-4 text-indigo-600" />
                      System Backup & Local Data Management
                    </h3>

                    <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      {onOpenAdminTools && userRole === 'admin' && (
                        <div className="bg-slate-100 dark:bg-slate-800 p-3.5 rounded-lg text-slate-900 dark:text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-slate-200 dark:border-slate-700">
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                              Institutional Governance & Data Suite
                            </h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Access full Audit Trail, action logging, and one-click ZIP backup suite.
                            </p>
                          </div>
                          <button
                            onClick={onOpenAdminTools}
                            className="px-3.5 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex-shrink-0"
                          >
                            Launch Suite
                          </button>
                        </div>
                      )}

                      {/* Cohort & Academic Year Management */}
                      {onOpenCohortManager && userRole === 'admin' && (
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-50/80 rounded-xl border border-indigo-200">
                          <div>
                            <h4 className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                              <GraduationCap className="w-4 h-4 text-indigo-600" />
                              Cohorts & Academic Years (2026, 2027+)
                            </h4>
                            <p className="text-[10px] text-indigo-700 mt-0.5">
                              Manage graduating classes, roster allocations, and curriculum rollover for future cohorts.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenCohortManager();
                            }}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <GraduationCap className="w-3.5 h-3.5" /> Manage Cohorts
                          </button>
                        </div>
                      )}

                      <hr className="border-slate-200" />

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900">Export Local Portal Data</h4>
                          <p className="text-[10px] text-slate-500">Download a full JSON backup of custom assignments, submissions & notifications.</p>
                        </div>
                        <button
                          onClick={onExportBackup}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" /> Export JSON
                        </button>
                      </div>

                      <hr className="border-slate-200" />

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900">Restore Backup File</h4>
                          <p className="text-[10px] text-slate-500">Upload a previously exported JSON backup file.</p>
                        </div>
                        <label className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs">
                          <Upload className="w-3.5 h-3.5" /> Restore JSON
                          <input 
                            type="file" 
                            accept=".json"
                            onChange={handleFileUpload}
                            className="hidden" 
                          />
                        </label>
                      </div>

                      {importStatus === 'success' && (
                        <p className="text-emerald-700 font-bold text-[11px] bg-emerald-50 border border-emerald-200 p-2 rounded-lg flex items-center gap-1">
                          <Check className="w-4 h-4 text-emerald-600" /> Data backup successfully restored!
                        </p>
                      )}

                      {importStatus === 'error' && (
                        <p className="text-rose-700 font-bold text-[11px] bg-rose-50 border border-rose-200 p-2 rounded-lg">
                          ⚠️ {importErrorMessage}
                        </p>
                      )}

                      <hr className="border-slate-200" />

                      {/* Migrate Profile Pictures to Supabase Storage */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-purple-50 rounded-xl border border-purple-200">
                        <div>
                          <h4 className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                            <UploadCloud className="w-3.5 h-3.5 text-purple-600" />
                            Save Local Profile Pictures to Supabase
                          </h4>
                          <p className="text-[10px] text-purple-700 mt-0.5">
                            Upload all student profile photos and faculty portraits stored in browser cache to Supabase Storage.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            setIsMigratingPhotos(true);
                            setPhotoMigrationStatus(null);
                            try {
                              const res = await migrateLocalStorageProfilePicturesToSupabase();
                              if (res.success) {
                                setPhotoMigrationStatus(`✓ Saved ${res.totalUploaded} profile photo(s) to Supabase Storage!`);
                                if (onPhotosMigrated) onPhotosMigrated();
                              } else {
                                setPhotoMigrationStatus(`Notice: ${res.errors.join(', ')}`);
                              }
                            } catch (e: any) {
                              setPhotoMigrationStatus(`Error: ${e.message || String(e)}`);
                            } finally {
                              setIsMigratingPhotos(false);
                            }
                          }}
                          disabled={isMigratingPhotos}
                          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                        >
                          {isMigratingPhotos ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5 animate-spin" /> Saving...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Save to Cloud
                            </>
                          )}
                        </button>
                      </div>

                      {photoMigrationStatus && (
                        <p className={`font-bold text-[11px] p-2 rounded-lg ${
                          photoMigrationStatus.startsWith('✓') 
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                            : 'text-purple-700 bg-purple-50 border border-purple-200'
                        }`}>
                          {photoMigrationStatus}
                        </p>
                      )}

                      <hr className="border-slate-200" />

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div>
                          <h4 className="font-bold text-rose-700">Reset Local System Storage</h4>
                          <p className="text-[10px] text-slate-500">Clear custom data and restore default demo assignments & grades.</p>
                        </div>

                        {!showResetConfirm ? (
                          <button
                            onClick={() => setShowResetConfirm(true)}
                            className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs rounded-lg transition-colors cursor-pointer border border-rose-300 flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Reset Data
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                onResetAllData?.();
                                setShowResetConfirm(false);
                              }}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                            >
                              Confirm Reset
                            </button>
                            <button
                              onClick={() => setShowResetConfirm(false)}
                              className="px-2 py-1 bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 4. ABOUT HTEIM SCHOOL OF MINISTRY TAB */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              {/* Institution Hero */}
              <div className="p-4 bg-gradient-to-br from-amber-500/10 via-amber-100/30 to-indigo-50 border border-amber-200 rounded-xl flex items-center gap-4">
                <LogoImage className="w-16 h-16 shrink-0" />
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">
                    HTEIM SCHOOL OF MINISTRY
                  </h3>
                  <p className="text-xs font-bold text-amber-900">Heaven Touching Earth Int'l Ministries</p>
                  <p className="text-xs italic font-serif text-slate-600 mt-1">
                    "Bringing Heaven to Earth, Taking People to Heaven"
                  </p>
                </div>
              </div>

              {/* Mission & Purpose */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h4 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Institutional Mission & Core Objective
                </h4>
                <p className="text-slate-600 leading-relaxed text-xs">
                  The HTEIM School of Ministry exists to equip, empower, and commission ministerial leaders with rigorous biblical foundations, hermeneutical accuracy, and practical pastoral competencies for global Christian ministry.
                </p>
              </div>

              {/* White-Label Custom Institutional Profile Card (Recommended) */}
              <div>
                <h3 className="font-extrabold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5 text-[11px]">
                  <Building2 className="w-4 h-4 text-amber-500" />
                  White-Label Institutional Customization
                </h3>
                <p className="text-[11px] text-slate-500 mb-3">
                  Tailor the institutional profile, contact credentials, and signatures appearing on PDFs and official reports.
                </p>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  {isLocked && (
                    <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-lg font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Institutional profile customization is restricted to Administrator accounts.</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Institution Address */}
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Official Address</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={instAddress}
                        onChange={(e) => {
                          setInstAddress(e.target.value);
                          setInstAddressError(e.target.value.trim() ? null : 'Address is required');
                        }}
                        onBlur={() => setInstAddressError(instAddress.trim() ? null : 'Address is required')}
                        placeholder="e.g. 124 Ministry Lane, NY 10001"
                        className={`w-full p-2 bg-white border rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 ${instAddressError ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200'}`}
                      />
                      {instAddressError && (
                        <p className="text-[10px] text-rose-600 font-medium mt-0.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {instAddressError}
                        </p>
                      )}
                    </div>

                    {/* Phone & Email */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Office Contact Phone</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={instPhone}
                        onChange={(e) => {
                          setInstPhone(e.target.value);
                          setInstPhoneError(validatePhone(e.target.value));
                        }}
                        onBlur={() => setInstPhoneError(validatePhone(instPhone))}
                        placeholder="e.g. +1 (555) 777-1212"
                        className={`w-full p-2 bg-white border rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 ${instPhoneError ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200'}`}
                      />
                      {instPhoneError && (
                        <p className="text-[10px] text-rose-600 font-medium mt-0.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {instPhoneError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Contact Email Address</label>
                      <input
                        type="email"
                        disabled={isLocked}
                        value={instEmail}
                        onChange={(e) => {
                          setInstEmail(e.target.value);
                          setInstEmailError(validateEmail(e.target.value));
                        }}
                        onBlur={() => setInstEmailError(validateEmail(instEmail))}
                        placeholder="e.g. office@school.org"
                        className={`w-full p-2 bg-white border rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 ${instEmailError ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200'}`}
                      />
                      {instEmailError && (
                        <p className="text-[10px] text-rose-600 font-medium mt-0.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {instEmailError}
                        </p>
                      )}
                    </div>

                    {/* Authorized Signatory */}
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Authorized Certifying Signatory Name</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={authorizedSignature}
                        onChange={(e) => {
                          setAuthorizedSignature(e.target.value);
                          setAuthorizedSignatureError(e.target.value.trim() ? null : 'Signatory name is required');
                        }}
                        onBlur={() => setAuthorizedSignatureError(authorizedSignature.trim() ? null : 'Signatory name is required')}
                        placeholder="e.g. Apostle Kendell Pierre"
                        className={`w-full p-2 bg-white border rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 ${authorizedSignatureError ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200'}`}
                      />
                      {authorizedSignatureError && (
                        <p className="text-[10px] text-rose-600 font-medium mt-0.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {authorizedSignatureError}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-0.5 font-normal">This name is digitally stamped on PDF receipt files and course completion certificates.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Developer & Software Technology Partner Information */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        App Developer & Technology Partner
                      </h4>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Rockproxy Technologies</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 text-[10px] font-mono rounded-full font-semibold">
                    Official Software Partner
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <UserCheck className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span>Director: <strong className="text-slate-900 dark:text-white">Kendell Pierre</strong></span>
                  </div>

                  <a 
                    href="mailto:rockproxytechnologies@gmail.com" 
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors group"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-700 flex-shrink-0" />
                    <span className="underline font-mono text-[11px] truncate">rockproxytechnologies@gmail.com</span>
                  </a>
                </div>
              </div>

              {/* Portal System Information */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">System Build</span>
                  <span className="font-extrabold text-slate-900 block">v2.5.0 Enterprise Portal</span>
                  <span className="text-[10px] text-slate-500 block">React 18 • Vite • Tailwind CSS</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Live Data Sync</span>
                  <span className="font-extrabold text-emerald-700 block">Google Sheets REST API</span>
                  <span className="text-[10px] text-slate-500 block">Real-time attendance & grades</span>
                </div>
              </div>

              {/* Mobile App Download Hub Card */}
              {onOpenMobileDownloadCenter && (
                <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-50 dark:from-amber-950/30 dark:to-slate-900 border border-amber-300/80 dark:border-amber-800/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-xs">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">
                        Install HTEIM App
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        Install on Android, iPhone/iPad, or Computer for offline study and fast access.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenMobileDownloadCenter();
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install App</span>
                  </button>
                </div>
              )}

              {/* User Guide Button */}
              {onOpenGuide && (
                <div className="pt-2 flex justify-between items-center bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
                  <div>
                    <h5 className="font-bold text-indigo-950 text-xs">Need help using the portal?</h5>
                    <p className="text-[10px] text-slate-600">Open the complete guide for sharing, PDF printing & CSV export.</p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenGuide();
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> Open Guide
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2 flex-shrink-0 modal-material-footer">
          <div className="text-[10px] text-slate-500 font-medium">
            <span>HTEIM Ministry ERP • v1.0.0</span>
            <span className="mx-1.5 text-slate-300">•</span>
            <span>Created by <strong className="text-slate-800">Rockproxy Technologies</strong> (Director: Kendell Pierre)</span>
          </div>
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Save & Close Settings
          </button>
        </div>

      </div>

      {/* Push Notification Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />
    </div>
  );
};
