import React, { useState, useEffect } from 'react';
import { useAccessibleModal } from '../lib/useAccessibleModal';
import {
  Bell,
  CheckCircle2,
  Clock,
  Award,
  CreditCard,
  Radio,
  Volume2,
  X,
  Smartphone,
  Play,
} from 'lucide-react';
import {
  getPushPreferences,
  savePushPreferences,
  requestPushNotificationPermission,
  PushNotificationPreferences,
  PushNotificationTriggers,
} from '../lib/pushNotifications';
import { triggerHapticFeedback } from '../lib/capacitorBridge';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const dialogRef = useAccessibleModal(isOpen, onClose);
  const [prefs, setPrefs] = useState<PushNotificationPreferences>(getPushPreferences());
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [testSent, setTestSent] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
    setPrefs(getPushPreferences());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof PushNotificationPreferences) => {
    triggerHapticFeedback('light');
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    savePushPreferences(updated);
  };

  const handleRequestPermission = async () => {
    triggerHapticFeedback('medium');
    const granted = await requestPushNotificationPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
  };

  const handleTestNotification = (type: 'assignment' | 'grade' | 'class' | 'payment') => {
    triggerHapticFeedback('medium');
    setTestSent(type);
    setTimeout(() => setTestSent(null), 3000);

    switch (type) {
      case 'assignment':
        PushNotificationTriggers.assignmentDueTomorrow('Hermeneutics Essay: Exegesis of Romans 8', 'Module 1: Biblical Hermeneutics');
        break;
      case 'grade':
        PushNotificationTriggers.gradeReleased('Module 3 Midterm Examination', 'A', 94);
        break;
      case 'class':
        PushNotificationTriggers.classBeginsIn30Minutes('Homiletics & Expository Preaching', '7:00 PM EST');
        break;
      case 'payment':
        PushNotificationTriggers.paymentReceived(250.0, 'REC-8842', 'Alex Burke');
        break;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-pref-title"
    >
      <div
        ref={dialogRef}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 id="push-pref-title" className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Mobile & Push Notifications
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure instant reminders for classes, homework, and tuition
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
          {/* Permission Status Banner */}
          {permissionStatus !== 'granted' && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <div className="font-bold text-amber-950 dark:text-amber-200 text-xs">
                    Enable System Push Alerts
                  </div>
                  <div className="text-[11px] text-amber-800 dark:text-amber-300">
                    Allow notifications to receive class starting and grade alerts on lock screen.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shrink-0 cursor-pointer shadow-2xs"
              >
                Allow Alerts
              </button>
            </div>
          )}

          {/* Master Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">Push Notifications</div>
              <div className="text-xs text-slate-500">Master toggle for all mobile and desktop alerts</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.enabled}
                onChange={() => handleToggle('enabled')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Specific Notification Channels */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Notification Channels
            </h3>

            {/* Assignment Due */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-sky-500 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    Assignment Due Reminders
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Notifies 24 hours and 2 hours before submission deadline
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.assignmentReminders}
                disabled={!prefs.enabled}
                onChange={() => handleToggle('assignmentReminders')}
                className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
              />
            </div>

            {/* Grade Released */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center gap-2.5">
                <Award className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    Grade & Exam Result Releases
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Instant alert when faculty publishes an evaluated score
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.gradeReleases}
                disabled={!prefs.enabled}
                onChange={() => handleToggle('gradeReleases')}
                className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
              />
            </div>

            {/* Class Begins in 30 Min */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center gap-2.5">
                <Radio className="w-4 h-4 text-purple-500 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    Class & Live Lecture Countdown
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Reminder 30 minutes before live ministerial lectures begin
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.classStartingAlerts}
                disabled={!prefs.enabled}
                onChange={() => handleToggle('classStartingAlerts')}
                className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
              />
            </div>

            {/* Payment Received */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    Tuition & Payment Receipts
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Confirmation notice when tuition payments are posted
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.paymentConfirmations}
                disabled={!prefs.enabled}
                onChange={() => handleToggle('paymentConfirmations')}
                className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
              />
            </div>

            {/* Sound */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    Notification Sound & Vibration
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Play gentle chime and trigger haptic buzz on alert
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.sound}
                disabled={!prefs.enabled}
                onChange={() => handleToggle('sound')}
                className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
              />
            </div>
          </div>

          {/* Test Notification Simulator */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Preview Instant Alerts
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTestNotification('assignment')}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-500/10 hover:border-amber-500/40 text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Assignment Due</div>
                  <div className="text-[10px] text-slate-500">Simulate 24h reminder</div>
                </div>
                {testSent === 'assignment' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Play className="w-3 h-3 text-slate-400" />}
              </button>

              <button
                type="button"
                onClick={() => handleTestNotification('grade')}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-500/10 hover:border-amber-500/40 text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Grade Released</div>
                  <div className="text-[10px] text-slate-500">Simulate score alert</div>
                </div>
                {testSent === 'grade' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Play className="w-3 h-3 text-slate-400" />}
              </button>

              <button
                type="button"
                onClick={() => handleTestNotification('class')}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-500/10 hover:border-amber-500/40 text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Class in 30 Min</div>
                  <div className="text-[10px] text-slate-500">Simulate lecture start</div>
                </div>
                {testSent === 'class' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Play className="w-3 h-3 text-slate-400" />}
              </button>

              <button
                type="button"
                onClick={() => handleTestNotification('payment')}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-500/10 hover:border-amber-500/40 text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Payment Posted</div>
                  <div className="text-[10px] text-slate-500">Simulate receipt alert</div>
                </div>
                {testSent === 'payment' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Play className="w-3 h-3 text-slate-400" />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
