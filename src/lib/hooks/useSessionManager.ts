import { useEffect, useRef, useState, useCallback } from 'react';
import { AppUser } from '../userAuth';
import { getAppAuthConfig } from '../supabaseConnector';
import { logger } from '../logger';

interface UseSessionManagerProps {
  currentUser: AppUser | null;
  onLogout: () => void;
}

export function useSessionManager({ currentUser, onLogout }: UseSessionManagerProps) {
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarningModal) {
      setShowWarningModal(false);
    }
  }, [showWarningModal]);

  useEffect(() => {
    if (!currentUser) {
      setShowWarningModal(false);
      return;
    }

    const config = getAppAuthConfig();
    const timeoutMin = config.sessionTimeoutMinutes || 0;
    if (timeoutMin <= 0) return; // Inactivity timeout disabled

    const timeoutMs = timeoutMin * 60 * 1000;
    const warningMs = Math.max(timeoutMs - 60 * 1000, timeoutMs * 0.9);

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    const handleUserActivity = () => {
      // Throttle activity updates to once every 5 seconds
      if (Date.now() - lastActivityRef.current > 5000) {
        lastActivityRef.current = Date.now();
      }
    };

    activityEvents.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= timeoutMs) {
        logger.info('Session timed out due to inactivity. Logging off.');
        setShowWarningModal(false);
        onLogout();
      } else if (elapsed >= warningMs && !showWarningModal) {
        setShowWarningModal(true);
        const secsLeft = Math.max(1, Math.round((timeoutMs - elapsed) / 1000));
        setRemainingSeconds(secsLeft);
      } else if (showWarningModal) {
        const secsLeft = Math.max(1, Math.round((timeoutMs - elapsed) / 1000));
        setRemainingSeconds(secsLeft);
      }
    }, 1000);

    timerRef.current = checkInterval;

    return () => {
      clearInterval(checkInterval);
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
    };
  }, [currentUser, onLogout, showWarningModal]);

  return {
    showWarningModal,
    remainingSeconds,
    extendSession: resetActivity,
    setShowWarningModal,
  };
}
