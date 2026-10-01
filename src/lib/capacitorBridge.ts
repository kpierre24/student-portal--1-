import { Capacitor } from '@capacitor/core';

export interface MobileDeviceCapabilities {
  isNative: boolean;
  platform: 'android' | 'ios' | 'web';
  isAndroid: boolean;
  isIOS: boolean;
  hasTouchScreen: boolean;
  supportsBiometrics: boolean;
  supportsPush: boolean;
}

/**
 * Checks current platform runtime environment
 */
export function getDeviceCapabilities(): MobileDeviceCapabilities {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform() as 'android' | 'ios' | 'web';
  const hasTouchScreen =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const supportsBiometrics =
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined';

  const supportsPush =
    isNative || (typeof window !== 'undefined' && 'Notification' in window);

  return {
    isNative,
    platform,
    isAndroid: platform === 'android',
    isIOS: platform === 'ios',
    hasTouchScreen,
    supportsBiometrics,
    supportsPush,
  };
}

/**
 * Configure mobile status bar styling & theme color
 */
export function configureMobileStatusBar(theme: 'dark' | 'light') {
  if (typeof document === 'undefined') return;

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  const targetColor = theme === 'dark' ? '#08182c' : '#002855';

  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', targetColor);
  } else {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = targetColor;
    document.head.appendChild(meta);
  }

  // If running inside Capacitor Native Container, set styling classes
  if (Capacitor.isNativePlatform()) {
    document.documentElement.classList.add('capacitor-native');
    if (Capacitor.getPlatform() === 'android') {
      document.documentElement.classList.add('platform-android');
    } else if (Capacitor.getPlatform() === 'ios') {
      document.documentElement.classList.add('platform-ios');
    }
  }
}

/**
 * Native Haptic Feedback trigger with Web Vibration API fallback
 */
export function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') {
  if (typeof window === 'undefined') return;

  try {
    if ('vibrate' in navigator) {
      switch (type) {
        case 'light':
          navigator.vibrate(15);
          break;
        case 'medium':
          navigator.vibrate(30);
          break;
        case 'heavy':
          navigator.vibrate(60);
          break;
        case 'success':
          navigator.vibrate([20, 50, 20]);
          break;
        case 'warning':
          navigator.vibrate([40, 60, 40]);
          break;
        case 'error':
          navigator.vibrate([50, 50, 50, 50]);
          break;
      }
    }
  } catch (err) {
    // Graceful silent fallback
  }
}

/**
 * Native Share Helper
 */
export async function shareNativeContent(title: string, text: string, url: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return true;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share failed:', err);
      }
      return false;
    }
  }
  return false;
}
