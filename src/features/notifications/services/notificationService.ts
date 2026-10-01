import { Notification, BroadcastMessage } from '../types';

const STORAGE_KEY = 'hteim_notifications';
const BROADCAST_STORAGE_KEY = 'hteim_broadcasts';

export const notificationService = {
  getNotifications(): Notification[] {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  },

  saveNotifications(notifications: Notification[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  },

  markAsRead(notificationId: string): void {
    const notifications = this.getNotifications();
    const index = notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      notifications[index].isRead = true;
      this.saveNotifications(notifications);
    }
  },

  getBroadcasts(): BroadcastMessage[] {
    const saved = localStorage.getItem(BROADCAST_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  },

  addBroadcast(broadcast: BroadcastMessage): void {
    const broadcasts = this.getBroadcasts();
    this.saveBroadcasts([broadcast, ...broadcasts]);
  },

  saveBroadcasts(broadcasts: BroadcastMessage[]): void {
    localStorage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(broadcasts));
  }
};
