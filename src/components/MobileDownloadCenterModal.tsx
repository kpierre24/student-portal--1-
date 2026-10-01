import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  QrCode,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Wifi,
  WifiOff,
  Settings,
  Sparkles,
  RefreshCw,
  Info,
  Globe,
  Share2,
  X,
  Laptop,
  Apple,
} from 'lucide-react';
import { usePWAInstall } from '../lib/pwa';

interface MobileDownloadCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDownloadCenterModal: React.FC<MobileDownloadCenterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { deferredPrompt, isInstallable, isStandalone, triggerInstall, isIOS } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop' | 'qr'>('android');
  const [copiedLink, setCopiedLink] = useState(false);
  const [installSuccessMessage, setInstallSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://hteim-erp.app';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleTriggerInstall = async () => {
    if (triggerInstall) {
      const success = await triggerInstall();
      if (success) {
        setInstallSuccessMessage('App installed successfully! You can now launch it from your home screen.');
        setTimeout(() => setInstallSuccessMessage(null), 5000);
      }
    }
  };

  const generateInlineSvgQR = () => {
    return (
      <svg className="w-44 h-44 mx-auto" viewBox="0 0 100 100" fill="none">
        <rect width="100" height="100" fill="#ffffff" rx="12" />
        <path d="M10 10h24v24H10zM14 14v16h16V14zM18 18h8v8h-8z" fill="#0f172a" />
        <path d="M66 10h24v24H66zM70 14v16h16V14zM74 18h8v8h-8z" fill="#0f172a" />
        <path d="M10 66h24v24H10zM14 70v16h16V70zM18 74h8v8h-8z" fill="#0f172a" />
        <path
          d="M40 10h6v6h-6zM50 10h6v6h-6zM40 20h12v6H40zM56 20h6v6h-6zM40 30h6v6h-6zM50 30h12v6H50z M10 40h6v6h-6zM20 40h12v6H20zM36 40h6v6h-6zM46 40h16v6H46zM66 40h6v6h-6zM76 40h14v6H76z M10 50h12v6H10zM26 50h6v6h-6zM36 50h12v6H36zM52 50h6v6h-6zM62 50h14v6H62zM80 50h10v6H80z M10 60h6v6h-6zM20 60h6v6h-6zM30 60h12v6H30zM46 60h6v6h-6zM56 60h14v6H56zM74 60h16v6H74z M40 70h6v6h-6zM50 70h12v6H50zM66 70h6v6h-6zM76 70h14v6H76z M40 80h12v6H40zM56 80h10v6H56zM70 80h6v6h-6zM80 80h10v6H80z M40 90h6v6h-6zM50 90h16v6H50zM70 90h20v6H70z"
          fill="#1e293b"
        />
        <rect x="42" y="42" width="16" height="16" fill="#b38f53" rx="4" />
        <path d="M46 46h8v8h-8z" fill="#ffffff" />
      </svg>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-4 md:p-6 overflow-y-auto animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Install HTEIM App"
    >
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-[#08182c] border border-slate-200 dark:border-[#1a385c] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-slate-50 dark:bg-[#051120] border-b border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-primary-container)] flex items-center justify-center text-white font-black shadow-md shrink-0 dark:bg-sky-600">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Install HTEIM App
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  Offline Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Install as a dedicated standalone app on your phone, tablet, or computer
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Notification Banner */}
        {installSuccessMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 px-5 py-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{installSuccessMessage}</span>
          </div>
        )}

        {/* Tab Selection Navigation */}
        <div className="bg-slate-100/70 dark:bg-[#061424] border-b border-slate-200 dark:border-slate-800 px-4 sm:px-5 pt-3 flex items-center gap-1 sm:gap-2 overflow-x-auto custom-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`px-3.5 sm:px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'android'
                ? 'bg-white dark:bg-[#08182c] text-[var(--color-primary)] border-t-2 border-[var(--color-primary)] shadow-xs dark:text-sky-300 dark:border-sky-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-500" />
            <span>Android</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`px-3.5 sm:px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'ios'
                ? 'bg-white dark:bg-[#08182c] text-[var(--color-primary)] border-t-2 border-[var(--color-primary)] shadow-xs dark:text-sky-300 dark:border-sky-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Apple className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            <span>iPhone / iPad</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('desktop')}
            className={`px-3.5 sm:px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'desktop'
                ? 'bg-white dark:bg-[#08182c] text-[var(--color-primary)] border-t-2 border-[var(--color-primary)] shadow-xs dark:text-sky-300 dark:border-sky-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Laptop className="w-4 h-4 text-indigo-500" />
            <span>Computer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`px-3.5 sm:px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'qr'
                ? 'bg-white dark:bg-[#08182c] text-[var(--color-primary)] border-t-2 border-[var(--color-primary)] shadow-xs dark:text-sky-300 dark:border-sky-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4 text-amber-500" />
            <span>Scan with Phone</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* ================= TAB 1: ANDROID ================= */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Install App on Android
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                      Enjoy instant launch times, full offline attendance tracking, and automatic sync directly from your home screen.
                    </p>
                  </div>
                  <Smartphone className="w-8 h-8 text-emerald-500 shrink-0" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white dark:bg-[#08182c] border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                    <WifiOff className="w-4 h-4 text-amber-500" />
                    <span className="font-bold block text-slate-800 dark:text-slate-200">100% Offline</span>
                    <span className="text-[11px] text-slate-400 block">Take attendance & study offline</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#08182c] border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                    <Sparkles className="w-4 h-4 text-sky-500" />
                    <span className="font-bold block text-slate-800 dark:text-slate-200">Instant Launch</span>
                    <span className="text-[11px] text-slate-400 block">Runs in fullscreen standalone mode</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#08182c] border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold block text-slate-800 dark:text-slate-200">Auto Sync</span>
                    <span className="text-[11px] text-slate-400 block">Syncs changes automatically</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTriggerInstall}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install App (PWA Direct)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-semibold text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Portal Link'}</span>
                  </button>
                </div>

                {/* Native Android Packaging (AAB / APK) Box */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-sky-500" />
                      Native Android Packaging (Capacitor AAB / APK)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                      Capacitor v7 Ready
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    To build a native Android APK or Google Play Store bundle (AAB) for physical devices:
                  </p>

                  <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] space-y-1.5 overflow-x-auto border border-slate-800">
                    <div className="text-emerald-400"># 1. Sync assets into native Android project</div>
                    <div>npm run build && npx cap sync android</div>
                    <div className="text-amber-400 pt-1"># 2. Open in Android Studio or compile APK with Gradle</div>
                    <div>cd android && ./gradlew assembleDebug</div>
                    <div className="text-sky-400 pt-1"># 3. APK location:</div>
                    <div className="text-slate-400">android/app/build/outputs/apk/debug/app-debug.apk</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: IPHONE / IPAD ================= */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Add to Home Screen on iPhone & iPad
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Follow these 2 quick steps in Safari to add HTEIM to your iOS home screen:
                    </p>
                  </div>
                  <Apple className="w-8 h-8 text-slate-700 dark:text-slate-200 shrink-0" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3.5 bg-white dark:bg-[#08182c] border border-slate-200 dark:border-slate-800 rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div className="text-xs leading-relaxed">
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        Tap the Share button
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                        In Safari&apos;s bottom toolbar (or top right on iPad), tap the <Share2 className="w-3.5 h-3.5 inline mx-1 text-sky-500" /> <strong>Share</strong> icon.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 bg-white dark:bg-[#08182c] border border-slate-200 dark:border-slate-800 rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div className="text-xs leading-relaxed">
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        Tap &ldquo;Add to Home Screen&rdquo;
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                        Scroll down the menu list and select <strong>Add to Home Screen</strong>, then tap <strong>Add</strong> in the top right.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-semibold text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Portal Link for Safari'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: COMPUTER ================= */}
          {activeTab === 'desktop' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Install App on Computer
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                      Install HTEIM as a native desktop application on Mac, Windows, or Linux. Launches directly from your Dock or Taskbar with offline support.
                    </p>
                  </div>
                  <Laptop className="w-8 h-8 text-indigo-500 shrink-0" />
                </div>

                <div className="p-4 bg-white dark:bg-[#08182c] border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    How to install on Chrome or Edge:
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                    Click the install icon (<Download className="w-3.5 h-3.5 inline mx-0.5 text-indigo-500" />) in your browser&apos;s address bar, or click <strong>Install App</strong> below.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTriggerInstall}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install App</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: QR PAIR ================= */}
          {activeTab === 'qr' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-6 text-center space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Scan with your Phone Camera
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Open your camera app and scan this code to launch and install the portal on mobile.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl inline-block shadow-md">
                {generateInlineSvgQR()}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Portal URL'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
