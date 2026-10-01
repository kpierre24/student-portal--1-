export type NotificationType = 'broadcast' | 'assignment' | 'grade' | 'payment' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  sender?: string;
  createdAt: string;
  isRead: boolean;
  actionUrl?: string;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  typesEnabled: Record<NotificationType, boolean>;
}

export interface BroadcastMessage {
  id: string;
  title: string;
  content: string;
  targetAudience: 'all' | 'students' | 'teachers';
  createdAt: string;
  authorId: string;
}
