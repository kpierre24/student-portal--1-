import { useState, useEffect, useCallback } from 'react';
import { Notification } from '../types';
import { notificationService } from '../services/notificationService';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    setNotifications(notificationService.getNotifications());
  }, []);

  const markRead = useCallback((id: string) => {
    notificationService.markAsRead(id);
    setNotifications(notificationService.getNotifications());
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return { notifications, markRead, unreadCount };
};
