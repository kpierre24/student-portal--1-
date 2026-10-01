import React, { createContext, useContext, useState, useCallback } from 'react';
import type { AppNotification } from '../../types';

export interface ToastItem {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
  title?: string;
  duration?: number;
}

export interface NotificationContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

export function useToasts() {
  const { toasts, addToast, removeToast, clearToasts } = useNotifications();
  return { toasts, addToast, removeToast, clearToasts };
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('hteim_portal_notifications');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastItem = { ...toast, id };
    
    setToasts(prev => [...prev.slice(-4), newToast]);

    const duration = toast.duration ?? (toast.type === 'error' ? 8000 : 4000);
    setTimeout(() => {
      removeToast(id);
    }, duration);

    return id;
  }, [removeToast]);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => (n.id === id ? { ...n, read: true } : n));
      try {
        localStorage.setItem('hteim_portal_notifications', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      try {
        localStorage.setItem('hteim_portal_notifications', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        clearToasts,
        notifications,
        setNotifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
