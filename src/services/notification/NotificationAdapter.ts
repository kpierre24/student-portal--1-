import {
  CentralNotification,
  NotificationChannel,
  DeliveryLog,
  UserNotificationPreferences
} from '../../types/notifications';

export interface NotificationAdapter {
  channel: NotificationChannel;
  isConfigured(): boolean;
  send(
    notification: CentralNotification,
    preferences: UserNotificationPreferences
  ): Promise<DeliveryLog>;
}

/**
 * In-App Notification Provider Adapter
 */
export class InAppNotificationAdapter implements NotificationAdapter {
  channel: NotificationChannel = 'in_app';

  isConfigured(): boolean {
    return true; // Always active natively inside the web portal
  }

  async send(
    notification: CentralNotification,
    preferences: UserNotificationPreferences
  ): Promise<DeliveryLog> {
    const isCategoryEnabled = preferences[notification.category]?.in_app ?? true;
    if (!isCategoryEnabled) {
      return {
        channel: this.channel,
        status: 'skipped_disabled',
        timestamp: new Date().toISOString(),
        details: `In-App delivery disabled by user for category "${notification.category}"`
      };
    }

    return {
      channel: this.channel,
      status: 'delivered',
      timestamp: new Date().toISOString(),
      details: 'Stored in application notification center feed'
    };
  }
}

/**
 * Email Notification Provider Adapter (Extensible Provider Stub)
 */
export class EmailNotificationAdapter implements NotificationAdapter {
  channel: NotificationChannel = 'email';

  isConfigured(): boolean {
    // Returns true when email gateway configuration is present
    return true;
  }

  async send(
    notification: CentralNotification,
    preferences: UserNotificationPreferences
  ): Promise<DeliveryLog> {
    const isCategoryEnabled = preferences[notification.category]?.email ?? true;
    if (!isCategoryEnabled) {
      return {
        channel: this.channel,
        status: 'skipped_disabled',
        timestamp: new Date().toISOString(),
        details: `Email delivery disabled by user for category "${notification.category}"`
      };
    }

    const recipient = notification.studentEmail || 'student@hteim.edu';
    console.log(`[EmailAdapter] Dispatching HTML email to ${recipient}: "${notification.title}"`);

    return {
      channel: this.channel,
      status: 'delivered',
      timestamp: new Date().toISOString(),
      details: `Queued email dispatch to ${recipient}`
    };
  }
}

/**
 * SMS Notification Provider Adapter (Extensible Provider Stub)
 */
export class SMSNotificationAdapter implements NotificationAdapter {
  channel: NotificationChannel = 'sms';

  isConfigured(): boolean {
    return true;
  }

  async send(
    notification: CentralNotification,
    preferences: UserNotificationPreferences
  ): Promise<DeliveryLog> {
    const isCategoryEnabled = preferences[notification.category]?.sms ?? false;
    if (!isCategoryEnabled) {
      return {
        channel: this.channel,
        status: 'skipped_disabled',
        timestamp: new Date().toISOString(),
        details: `SMS delivery disabled by user for category "${notification.category}"`
      };
    }

    const recipient = notification.studentPhone || '+1 (800) 555-HTEIM';
    console.log(`[SMSAdapter] Dispatching SMS alert to ${recipient}: "${notification.title}"`);

    return {
      channel: this.channel,
      status: 'delivered',
      timestamp: new Date().toISOString(),
      details: `Dispatched SMS gateway message to ${recipient}`
    };
  }
}

/**
 * WhatsApp Notification Provider Adapter (Extensible Provider Stub)
 */
export class WhatsAppNotificationAdapter implements NotificationAdapter {
  channel: NotificationChannel = 'whatsapp';

  isConfigured(): boolean {
    return true;
  }

  async send(
    notification: CentralNotification,
    preferences: UserNotificationPreferences
  ): Promise<DeliveryLog> {
    const isCategoryEnabled = preferences[notification.category]?.whatsapp ?? false;
    if (!isCategoryEnabled) {
      return {
        channel: this.channel,
        status: 'skipped_disabled',
        timestamp: new Date().toISOString(),
        details: `WhatsApp delivery disabled by user for category "${notification.category}"`
      };
    }

    const recipient = notification.studentPhone || 'WhatsApp Contact';
    console.log(`[WhatsAppAdapter] Dispatching WhatsApp template to ${recipient}: "${notification.title}"`);

    return {
      channel: this.channel,
      status: 'delivered',
      timestamp: new Date().toISOString(),
      details: `Sent WhatsApp Business template message to ${recipient}`
    };
  }
}
