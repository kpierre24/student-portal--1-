// PWA & Mobile Installation Manager
import { useState, useEffect } from 'react';
import { logger } from './logger';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners: Array<(prompt: BeforeInstallPromptEvent | null) => void> = [];

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((listener) => listener(globalDeferredPrompt));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    listeners.forEach((listener) => listener(null));
    logger.info('HTEIM ERP PWA installed successfully.');
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    // Check if running as PWA (standalone)
    const checkStandalone = () => {
      const isStandaloneMode =
        (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
        (typeof window !== 'undefined' && (window.navigator as any)?.standalone === true) ||
        (typeof document !== 'undefined' && document.referrer.includes('android-app://'));
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();
    const standaloneMediaQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)')
      : null;
    standaloneMediaQuery?.addEventListener?.('change', checkStandalone);

    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    }

    const handlePrompt = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt);
    };

    listeners.push(handlePrompt);

    return () => {
      standaloneMediaQuery?.removeEventListener?.('change', checkStandalone);
      const idx = listeners.indexOf(handlePrompt);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  const triggerInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        globalDeferredPrompt = null;
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      logger.error('PWA Installation error:', err);
    }
    return false;
  };

  return {
    deferredPrompt,
    isInstallable: !!deferredPrompt,
    isStandalone,
    isInstalled: isStandalone,
    isIOS,
    triggerInstall,
    install: triggerInstall,
  };
}

/**
 * Exports a valid PWA & TWA (Trusted Web Activity) configuration package
 * containing manifest.json, service worker registration details, and digital asset links metadata.
 */
export function downloadPWAConfigurationPackage(customName?: string) {
  const fileName = customName ? `${customName}-pwa-config.json` : 'HTEIM-School-Of-Ministry-PWA-Config.json';
  
  const configPackage = {
    packageType: 'HTEIM School of Ministry PWA & TWA Configuration',
    version: '2.4.0',
    webAppManifest: {
      name: 'HTEIM School of Ministry',
      short_name: 'HTEIM ERP',
      start_url: '/',
      display: 'standalone',
      background_color: '#0f172a',
      theme_color: '#d97706',
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    },
    trustedWebActivity: {
      packageName: 'org.hteim.ministry.erp',
      host: window.location.host,
      minSdkVersion: 26,
      targetSdkVersion: 34,
      permissions: [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.CAMERA'
      ]
    },
    exportTimestamp: new Date().toISOString(),
    instructions: 'Use this configuration with Bubblewrap CLI (bubblewrap init --manifest <url>) to compile a real signed Android App Bundle (AAB) or APK for Google Play Store deployment.'
  };

  const jsonString = JSON.stringify(configPackage, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

