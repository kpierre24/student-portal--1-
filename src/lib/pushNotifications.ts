import { toast } from 'sonner';
import { triggerHapticFeedback } from './capacitorBridge';

export interface PushNotificationPreferences {
  enabled: boolean;
  assignmentReminders: boolean;
  gradeReleases: boolean;
  classStartingAlerts: boolean;
  paymentConfirmations: boolean;
  liveChapelAlerts: boolean;
  sound: boolean;
}

const PREFS_STORAGE_KEY = 'hteim_push_preferences';

export const DEFAULT_PUSH_PREFERENCES: PushNotificationPreferences = {
  enabled: true,
  assignmentReminders: true,
  gradeReleases: true,
  classStartingAlerts: true,
  paymentConfirmations: true,
  liveChapelAlerts: true,
  sound: true,
};

export function getPushPreferences(): PushNotificationPreferences {
  if (typeof localStorage === 'undefined') return DEFAULT_PUSH_PREFERENCES;
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    return raw ? { ...DEFAULT_PUSH_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PUSH_PREFERENCES;
  } catch {
    return DEFAULT_PUSH_PREFERENCES;
  }
}

export function savePushPreferences(prefs: PushNotificationPreferences) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
}

/**
 * Request permission for native / browser Push Notifications
 */
export async function requestPushNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      const current = getPushPreferences();
      savePushPreferences({ ...current, enabled: granted });
      return granted;
    }
  } catch (err) {
    console.warn('Notification permission error:', err);
  }
  return false;
}

export type NotificationType =
  | 'assignment_due'
  | 'grade_released'
  | 'class_starting'
  | 'payment_received'
  | 'general';

export interface AppPushNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: string;
  data?: Record<string, any>;
  icon?: string;
}

/**
 * Dispatches an instant or scheduled notification across UI banner, Toast, and Web/Native Notification API
 */
export function triggerPushNotification(
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  const prefs = getPushPreferences();
  if (!prefs.enabled) return;

  // Filter against user preference categories
  if (type === 'assignment_due' && !prefs.assignmentReminders) return;
  if (type === 'grade_released' && !prefs.gradeReleases) return;
  if (type === 'class_starting' && !prefs.classStartingAlerts) return;
  if (type === 'payment_received' && !prefs.paymentConfirmations) return;

  // Trigger haptic feedback
  triggerHapticFeedback('medium');

  // Trigger Sonner Rich Toast
  toast(title, {
    description: body,
    duration: 6000,
    action: data?.actionLabel && data?.actionFn ? {
      label: data.actionLabel,
      onClick: data.actionFn,
    } : undefined,
  });

  // Trigger Native / Browser Notification if permission granted
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `hteim-${type}-${Date.now()}`,
      });
    } catch {
      // ServiceWorker registration fallback
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
          });
        });
      }
    }
  }
}

/**
 * Pre-built trigger helpers matching User specifications:
 * 1. Assignment due tomorrow
 * 2. Your grade has been released
 * 3. Class begins in 30 minutes
 * 4. Payment received
 */
export const PushNotificationTriggers = {
  assignmentDueTomorrow: (assignmentTitle: string, courseName?: string) => {
    triggerPushNotification(
      'assignment_due',
      '⏰ Assignment Due Tomorrow',
      `"${assignmentTitle}" for ${courseName || 'Curriculum'} is due tomorrow at 11:59 PM. Submit your work to maintain honor standing.`
    );
  },

  gradeReleased: (assignmentOrExam: string, gradeLetter: string, score: number) => {
    triggerPushNotification(
      'grade_released',
      '📊 Your Grade Has Been Released',
      `New assessment results posted for "${assignmentOrExam}": ${gradeLetter} (${score}%). Check your student transcript.`
    );
  },

  classBeginsIn30Minutes: (courseName: string, time: string = '7:00 PM EST') => {
    triggerPushNotification(
      'class_starting',
      '🏛️ Class Begins in 30 Minutes',
      `Live lecture for "${courseName}" begins at ${time}. Open the student portal to join the chapel broadcast.`
    );
  },

  paymentReceived: (amount: number, receiptNo: string, studentName?: string) => {
    triggerPushNotification(
      'payment_received',
      '💳 Payment Received',
      `Official tuition payment of $${amount.toFixed(2)} USD (Receipt #${receiptNo}) has been confirmed and credited.`
    );
  },
};
