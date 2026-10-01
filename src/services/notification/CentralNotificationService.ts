import {
  CentralNotification,
  NotificationCategory,
  NotificationEventType,
  NotificationPriority,
  UserNotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_DEFINITIONS,
  DeliveryLog
} from '../../types/notifications';
import {
  NotificationAdapter,
  InAppNotificationAdapter,
  EmailNotificationAdapter,
  SMSNotificationAdapter,
  WhatsAppNotificationAdapter
} from './NotificationAdapter';
import { portalApi } from '../api/portalApiClient';

type Listener = () => void;

class CentralNotificationServiceClass {
  private notifications: CentralNotification[] = [];
  private preferences: UserNotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES;
  private adapters: NotificationAdapter[] = [];
  private listeners: Listener[] = [];
  private isOnline = true;

  constructor() {
    // Register Channel Adapters
    this.adapters = [
      new InAppNotificationAdapter(),
      new EmailNotificationAdapter(),
      new SMSNotificationAdapter(),
      new WhatsAppNotificationAdapter()
    ];

    // Load initial state & preferences from localStorage if available
    this.loadState();

    // Fetch latest authoritative notifications from Express API
    this.syncFromBackend();
  }

  private loadState() {
    try {
      const storedPrefs = localStorage.getItem('hteim_notification_preferences');
      if (storedPrefs) {
        this.preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(storedPrefs) };
      }

      const storedNotifs = localStorage.getItem('hteim_app_notifications');
      if (storedNotifs) {
        this.notifications = JSON.parse(storedNotifs);
      }
    } catch {
      // Fallback to defaults if parsing fails
    }
  }

  private saveState() {
    try {
      localStorage.setItem('hteim_notification_preferences', JSON.stringify(this.preferences));
      localStorage.setItem('hteim_app_notifications', JSON.stringify(this.notifications));
    } catch {
      // Ignore storage errors
    }
    this.notifyListeners();
  }

  public async syncFromBackend() {
    try {
      const res = await portalApi.getNotifications({ limit: 60 });
      if (res && res.success && Array.isArray(res.notifications) && res.notifications.length > 0) {
        // Merge without duplicating IDs
        const existingIds = new Set(this.notifications.map(n => n.id));
        const newFromApi = res.notifications.filter(n => !existingIds.has(n.id));
        if (newFromApi.length > 0) {
          this.notifications = [...newFromApi, ...this.notifications];
          this.saveState();
        }
      }
    } catch {
      // Offline fallback: rely on memory/localStorage
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  /**
   * Get all active notifications
   */
  public getNotifications(): CentralNotification[] {
    return this.notifications;
  }

  /**
   * Bulk sync notifications array from external sources (e.g., Supabase / automated scan)
   */
  public setNotifications(notifs: CentralNotification[]) {
    this.notifications = notifs;
    this.saveState();
  }

  /**
   * Get total unread count for current user
   */
  public getUnreadCount(role?: string, studentName?: string): number {
    return this.getFilteredNotifications(role, studentName).filter(n => !n.read).length;
  }

  /**
   * Filter notifications relevant to current user with strict RBAC rules
   */
  public getFilteredNotifications(role?: string, studentName?: string): CentralNotification[] {
    const normRole = (role || 'student').toLowerCase().trim();
    const normName = (studentName || '').toLowerCase().trim();

    return this.notifications.filter(n => {
      const target = (n.targetRole || 'all').toLowerCase().trim();

      if (normRole === 'admin' || normRole === 'teacher') {
        if (target === 'student') return false;
        return target === 'admin' || target === 'teacher' || target === 'all';
      }

      if (normRole === 'student') {
        if (target === 'admin' || target === 'teacher') return false;
        if (n.studentName) {
          if (!normName) return false;
          const targetSt = n.studentName.toLowerCase().trim();
          return targetSt === normName || targetSt.includes(normName) || normName.includes(targetSt);
        }
        return target === 'student' || target === 'all';
      }

      return target === 'all';
    });
  }

  /**
   * Mark a single notification as read
   */
  public markAsRead(id: string) {
    this.notifications = this.notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    this.saveState();

    portalApi.markNotificationAsRead(id).catch(() => {
      // Local state preserved
    });
  }

  /**
   * Mark all notifications as read for current user
   */
  public markAllAsRead(role?: string, studentName?: string) {
    const filteredIds = new Set(this.getFilteredNotifications(role, studentName).map(n => n.id));
    this.notifications = this.notifications.map(n =>
      filteredIds.has(n.id) ? { ...n, read: true } : n
    );
    this.saveState();

    portalApi.markAllNotificationsAsRead(role || 'all', studentName).catch(() => {
      // Local state preserved
    });
  }

  /**
   * Clear all notifications
   */
  public clearAll() {
    this.notifications = [];
    this.saveState();
  }

  /**
   * Delete single notification
   */
  public deleteNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.saveState();

    portalApi.deleteNotification(id).catch(() => {
      // Local state preserved
    });
  }

  /**
   * Get user notification preferences
   */
  public getPreferences(): UserNotificationPreferences {
    return this.preferences;
  }

  /**
   * Update notification preferences
   */
  public updatePreferences(newPrefs: UserNotificationPreferences) {
    this.preferences = newPrefs;
    this.saveState();

    portalApi.saveNotificationPreferences(newPrefs).catch(() => {
      // Local state preserved
    });
  }

  /**
   * CENTRAL DISPATCHER: Trigger a new notification across enabled channels
   */
  public async notify(payload: {
    category?: NotificationCategory;
    eventType?: NotificationEventType;
    title: string;
    message: string;
    targetRole?: 'admin' | 'teacher' | 'student' | 'all';
    studentName?: string;
    studentEmail?: string;
    studentPhone?: string;
    assignmentId?: string;
    courseOfferingId?: string;
    actionTab?: any;
    priority?: NotificationPriority;
    metadata?: Record<string, any>;
  }): Promise<CentralNotification> {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = new Date().toISOString();

    const definition = payload.eventType && NOTIFICATION_DEFINITIONS[payload.eventType]
      ? NOTIFICATION_DEFINITIONS[payload.eventType]
      : null;

    const notifCategory = (payload.category || definition?.category || 'system') as NotificationCategory;
    const notifPriority = (payload.priority || definition?.defaultPriority || 'normal') as NotificationPriority;
    const notifTab = (payload.actionTab || definition?.actionTab || 'home');

    const notification: CentralNotification = {
      id,
      category: notifCategory,
      eventType: payload.eventType,
      type: payload.eventType,
      title: payload.title.trim(),
      message: payload.message.trim(),
      createdAt,
      read: false,
      priority: notifPriority,
      targetRole: payload.targetRole || (definition ? (definition.role === 'both' ? 'all' : definition.role) : 'all'),
      studentName: payload.studentName,
      studentEmail: payload.studentEmail,
      studentPhone: payload.studentPhone,
      assignmentId: payload.assignmentId,
      courseOfferingId: payload.courseOfferingId,
      actionTab: notifTab,
      metadata: payload.metadata,
      channelDelivery: {
        in_app: { delivered: true, deliveredAt: createdAt },
        email: { 
          enabled: true, 
          status: 'sent', 
          sentAt: createdAt,
          targetEmail: payload.studentEmail 
        },
        push: { 
          enabled: true, 
          status: 'sent', 
          sentAt: createdAt 
        },
        whatsapp: { 
          enabled: false, 
          status: 'planned', 
          targetPhone: payload.studentPhone 
        }
      },
      deliveryLogs: []
    };

    // Process delivery across registered adapters
    const deliveryLogs: DeliveryLog[] = [];
    for (const adapter of this.adapters) {
      try {
        const log = await adapter.send(notification, this.preferences);
        deliveryLogs.push(log);
      } catch (err: any) {
        deliveryLogs.push({
          channel: adapter.channel,
          status: 'failed',
          timestamp: new Date().toISOString(),
          details: err?.message || 'Delivery error'
        });
      }
    }

    notification.deliveryLogs = deliveryLogs;

    // Check if in-app delivery was allowed
    const inAppLog = deliveryLogs.find(l => l.channel === 'in_app');
    if (inAppLog && inAppLog.status === 'delivered') {
      this.notifications.unshift(notification);
      this.saveState();
    }

    // Sync to backend
    portalApi.createNotification(notification).catch(() => {
      // Local state preserved
    });

    return notification;
  }

  // --- Student Notification Helper Dispatchers ---
  public dispatchNewAssignment(courseTitle: string, lecturerName: string, dueDate: string, studentName?: string) {
    return this.notify({
      eventType: 'new_assignment',
      category: 'academic',
      title: `New Assignment: ${courseTitle}`,
      message: `${lecturerName} has published a new assignment due on ${dueDate}.`,
      targetRole: 'student',
      studentName,
      actionTab: 'courses',
      priority: 'normal'
    });
  }

  public dispatchAssignmentDeadline(assignmentTitle: string, hoursRemaining = 24, studentName?: string) {
    return this.notify({
      eventType: 'assignment_deadline',
      category: 'academic',
      title: `Deadline Approaching: ${assignmentTitle}`,
      message: `Your assignment is due in ${hoursRemaining} hours. Please submit your coursework before the cutoff.`,
      targetRole: 'student',
      studentName,
      actionTab: 'courses',
      priority: 'high'
    });
  }

  public dispatchGradePublished(assignmentTitle: string, score: number, studentName: string) {
    const standing = score >= 85 ? 'High Distinction' : score >= 75 ? 'Satisfactory' : 'At-Risk';
    return this.notify({
      eventType: 'grade_published',
      category: 'academic',
      title: `Grade Published: ${assignmentTitle}`,
      message: `Your evaluation has been finalized: ${score}% (${standing}).`,
      targetRole: 'student',
      studentName,
      actionTab: 'courses',
      priority: 'normal'
    });
  }

  public dispatchAttendanceWarning(courseTitle: string, attendanceRate: number, studentName: string) {
    return this.notify({
      eventType: 'attendance_warning',
      category: 'attendance',
      title: `Attendance Warning: ${courseTitle} (${attendanceRate.toFixed(1)}%)`,
      message: `Your current attendance rate has fallen below the mandatory 75% threshold. Please review your session attendance.`,
      targetRole: 'student',
      studentName,
      actionTab: 'attendance',
      priority: 'urgent'
    });
  }

  public dispatchPaymentReminder(amount: number, dueDate: string, studentName?: string) {
    return this.notify({
      eventType: 'payment_reminder',
      category: 'financial',
      title: `Tuition Payment Reminder: $${amount.toFixed(2)} Due`,
      message: `Your semester installment of $${amount.toFixed(2)} is due on ${dueDate}. Review your statement in the Payments tab.`,
      targetRole: 'student',
      studentName,
      actionTab: 'payments',
      priority: 'high'
    });
  }

  public dispatchNewAnnouncement(title: string, summary: string) {
    return this.notify({
      eventType: 'new_announcement',
      category: 'announcement',
      title: `Announcement: ${title}`,
      message: summary,
      targetRole: 'all',
      actionTab: 'home',
      priority: 'normal'
    });
  }

  public dispatchRegistrationConfirmation(courseTitle: string, termName: string, studentName: string) {
    return this.notify({
      eventType: 'registration_confirmation',
      category: 'enrollment',
      title: `Course Registration Confirmed: ${courseTitle}`,
      message: `You are officially registered for ${courseTitle} in ${termName}.`,
      targetRole: 'student',
      studentName,
      actionTab: 'courses',
      priority: 'normal'
    });
  }

  public dispatchLibraryResourceAdded(resourceTitle: string, department = 'Curriculum') {
    return this.notify({
      eventType: 'library_resource_added',
      category: 'library',
      title: `New Library Handout: ${resourceTitle}`,
      message: `A new study syllabus and theological reference has been added to the Digital Library (${department}).`,
      targetRole: 'student',
      actionTab: 'library',
      priority: 'low'
    });
  }

  // --- Administrator Notification Helper Dispatchers ---
  public dispatchNewEnrollment(studentName: string, cohortLevel = 'Level 1 Foundation') {
    return this.notify({
      eventType: 'new_enrollment',
      category: 'enrollment',
      title: `New Student Application: ${studentName}`,
      message: `${studentName} has submitted an application for enrollment into the ${cohortLevel} cohort.`,
      targetRole: 'admin',
      actionTab: 'students',
      priority: 'normal'
    });
  }

  public dispatchPaymentReceived(amount: number, studentName: string, receiptNumber: string) {
    return this.notify({
      eventType: 'payment_received',
      category: 'financial',
      title: `Tuition Payment Verified: $${amount.toFixed(2)}`,
      message: `Received $${amount.toFixed(2)} from ${studentName} (Receipt: #${receiptNumber}). Ledger updated.`,
      targetRole: 'admin',
      actionTab: 'payments',
      priority: 'normal'
    });
  }

  public dispatchOutstandingBalance(overdueStudentsCount: number, totalOverdue: number) {
    return this.notify({
      eventType: 'outstanding_balance',
      category: 'financial',
      title: `Overdue Tuition Balances: ${overdueStudentsCount} Student(s)`,
      message: `${overdueStudentsCount} student accounts have past-due tuition balances totaling $${totalOverdue.toFixed(2)}.`,
      targetRole: 'admin',
      actionTab: 'payments',
      priority: 'high'
    });
  }

  public dispatchAttendanceIssue(studentName: string, courseTitle: string, attendanceRate: number) {
    return this.notify({
      eventType: 'attendance_issue',
      category: 'attendance',
      title: `At-Risk Attendance Flag: ${studentName} (${attendanceRate.toFixed(1)}%)`,
      message: `${studentName} has dropped below the 75% attendance threshold in ${courseTitle}. Immediate follow-up recommended.`,
      targetRole: 'admin',
      actionTab: 'attendance',
      priority: 'urgent'
    });
  }

  public dispatchAssignmentSubmitted(studentName: string, assignmentTitle: string, courseTitle: string) {
    return this.notify({
      eventType: 'assignment_submitted',
      category: 'academic',
      title: `Assignment Submission: ${studentName}`,
      message: `${studentName} submitted coursework for "${assignmentTitle}" in ${courseTitle}. Ready for evaluation.`,
      targetRole: 'admin',
      actionTab: 'courses',
      priority: 'normal'
    });
  }

  public dispatchLecturerPendingGrades(lecturerName: string, courseTitle: string, daysPending = 5) {
    return this.notify({
      eventType: 'lecturer_pending_grades',
      category: 'academic',
      title: `Pending Grades Alert: ${lecturerName}`,
      message: `Coursework evaluations for ${courseTitle} by ${lecturerName} have been pending for ${daysPending} days.`,
      targetRole: 'admin',
      actionTab: 'courses',
      priority: 'high'
    });
  }
}

export const CentralNotificationService = new CentralNotificationServiceClass();
