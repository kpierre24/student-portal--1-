import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/rbac';
import { 
  CentralNotification, 
  NotificationChannel, 
  NotificationCategory, 
  NotificationEventType, 
  NotificationPriority,
  NOTIFICATION_DEFINITIONS,
  DEFAULT_NOTIFICATION_PREFERENCES,
  UserNotificationPreferences
} from '../../types/notifications';
import { TabType } from '../../types';

export const notificationsRouter = Router();

// Default-deny at the router level: All routes require authentication
notificationsRouter.use(requireAuth);

// In-memory fallback notifications when Supabase is not connected
let memoryNotifications: CentralNotification[] = [
  // --- Student Notifications ---
  {
    id: 'notif_std_1',
    category: 'academic',
    eventType: 'new_assignment',
    type: 'new_assignment',
    title: 'New Exegesis Paper Assigned: SOM-101',
    message: 'Pastor Samuel Selkridge has posted a new Hermeneutical Exegesis assignment due next Tuesday.',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    read: false,
    priority: 'normal',
    targetRole: 'student',
    studentName: 'Abigail Selkridge',
    actionTab: 'courses',
    channelDelivery: {
      in_app: { delivered: true, deliveredAt: new Date().toISOString() },
      email: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      push: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      whatsapp: { enabled: false, status: 'planned' }
    }
  },
  {
    id: 'notif_std_2',
    category: 'academic',
    eventType: 'assignment_deadline',
    type: 'assignment_deadline',
    title: 'Deadline Approaching: Evangelism Practicum Log',
    message: 'Your 2-page personal soul-winning practicum report is due in 48 hours for SOM-102.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    read: false,
    priority: 'high',
    targetRole: 'student',
    studentName: 'Abigail Selkridge',
    actionTab: 'courses',
    channelDelivery: {
      in_app: { delivered: true, deliveredAt: new Date().toISOString() },
      email: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      push: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      whatsapp: { enabled: false, status: 'planned' }
    }
  },
  {
    id: 'notif_std_3',
    category: 'academic',
    eventType: 'grade_published',
    type: 'grade_published',
    title: 'Grade Published: Pastoral Ethics Exam',
    message: 'Your evaluation for Ministerial Ethics Module 3 has been graded: 92% (A - High Distinction).',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    read: false,
    priority: 'normal',
    targetRole: 'student',
    studentName: 'Abigail Selkridge',
    actionTab: 'courses',
    channelDelivery: {
      in_app: { delivered: true, deliveredAt: new Date().toISOString() },
      email: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      push: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      whatsapp: { enabled: false, status: 'planned' }
    }
  },
  {
    id: 'notif_std_4',
    category: 'attendance',
    eventType: 'attendance_warning',
    type: 'attendance_warning',
    title: 'Institutional Attendance Warning (< 75%)',
    message: 'Your attendance rate in Module 2 Evangelism is currently 66.7%, below the mandatory 75% threshold. Please review your session records.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    read: false,
    priority: 'urgent',
    targetRole: 'student',
    studentName: 'Pastor Christy Arthur',
    actionTab: 'attendance',
    channelDelivery: {
      in_app: { delivered: true, deliveredAt: new Date().toISOString() },
      email: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      push: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      whatsapp: { enabled: false, status: 'planned' }
    }
  },
  {
    id: 'notif_std_5',
    category: 'financial',
    eventType: 'payment_reminder',
    type: 'payment_reminder',
    title: 'Tuition Installment Notice: 2026 Semester 1',
    message: 'Your second semester tuition installment is due on the 15th. Check your payment statement to view receipts and balances.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    read: false,
    priority: 'high',
    targetRole: 'student',
    actionTab: 'payments',
    channelDelivery: {
      in_app: { delivered: true, deliveredAt: new Date().toISOString() },
      email: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      push: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      whatsapp: { enabled: false, status: 'planned' }
    }
  },
  {
    id: 'notif_std_6',
    category: 'announcement',
    eventType: 'new_announcement',
    type: 'new_announcement',
    title: 'Apostolic Convocation & Live Broadcast',
    message: 'Special Ministry Convocation this Friday at 7:00 PM EST with Apostle Dr. Kendell Pierre. Broadcast live on zoom.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    read: false,
    priority: 'normal',
    targetRole: 'student',
    actionTab: 'home',
    channelDelivery: {
      in_app: { delivered: true, deliveredAt: new Date().toISOString() },
      email: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      push: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      whatsapp: { enabled: false, status: 'planned' }
    }
  },
  {
    id: 'notif_std_7',
    category: 'enrollment',
    eventType: 'registration_confirmation',
    type: 'registration_confirmation',
    title: 'Course Registration Confirmed: SOM-101',
    message: 'You are officially enrolled in SOM-101 Biblical Hermeneutics & Exegesis for 2026 Semester 1.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    read: true,
    priority: 'normal',
    targetRole: 'student',
    studentName: 'Abigail Selkridge',
    actionTab: 'courses',
    channelDelivery: {
      in_app: { delivered: true, deliveredAt: new Date().toISOString() },
      email: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      push: { enabled: false, status: 'disabled' },
      whatsapp: { enabled: false, status: 'planned' }
    }
  },
  {
    id: 'notif_std_8',
    category: 'library',
    eventType: 'library_resource_added',
    type: 'library_resource_added',
    title: 'New Ministerial Resource Uploaded',
    message: 'The "Hermeneutics & Exegesis Handout 2026" PDF syllabus has been added to the institutional digital library.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    read: true,
    priority: 'low',
    targetRole: 'student',
    actionTab: 'library',
    channelDelivery: {
      in_app: { delivered: true, deliveredAt: new Date().toISOString() },
      email: { enabled: false, status: 'disabled' },
      push: { enabled: false, status: 'disabled' },
      whatsapp: { enabled: false, status: 'planned' }
    }
  },

  // --- Administrator Notifications ---
  {
    id: 'notif_adm_1',
    category: 'enrollment',
    eventType: 'new_enrollment',
    type: 'new_enrollment',
    title: 'New Student Application Submitted',
    message: 'Pastor David Warner submitted an application for the Level 1 Foundation Cohort.',
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    read: false,
    priority: 'normal',
    targetRole: 'admin',
    actionTab: 'students',
    channelDelivery: {
      in_app: { delivered: true, deliveredAt: new Date().toISOString() },
      email: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      push: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      whatsapp: { enabled: false, status: 'planned' }
    }
  },
  {
    id: 'notif_adm_2',
    category: 'financial',
    eventType: 'payment_received',
    type: 'payment_received',
    title: 'Tuition Payment Received: $250.00',
    message: 'Student Abigail Selkridge submitted payment for 2026 Semester 1 tuition via Bank Transfer.',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    read: false,
    priority: 'normal',
    targetRole: 'admin',
    actionTab: 'payments',
    channelDelivery: {
      in_app: { delivered: true, deliveredAt: new Date().toISOString() },
      email: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      push: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      whatsapp: { enabled: false, status: 'planned' }
    }
  },
  {
    id: 'notif_adm_3',
    category: 'financial',
    eventType: 'outstanding_balance',
    type: 'outstanding_balance',
    title: 'Overdue Balance Notice: 3 Students',
    message: 'Three students have outstanding tuition balances totaling $750.00 that are past due for Semester 1.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    read: false,
    priority: 'high',
    targetRole: 'admin',
    actionTab: 'payments',
    channelDelivery: {
      in_app: { delivered: true, deliveredAt: new Date().toISOString() },
      email: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      push: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      whatsapp: { enabled: false, status: 'planned' }
    }
  },
  {
    id: 'notif_adm_4',
    category: 'attendance',
    eventType: 'attendance_issue',
    type: 'attendance_issue',
    title: 'At-Risk Attendance Flagged: Pastor Christy Arthur',
    message: 'Pastor Christy Arthur attendance rate dropped to 66.7% in SOM-102 (At-Risk trigger < 75%).',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    read: false,
    priority: 'urgent',
    targetRole: 'admin',
    actionTab: 'attendance',
    channelDelivery: {
      in_app: { delivered: true, deliveredAt: new Date().toISOString() },
      email: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      push: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      whatsapp: { enabled: false, status: 'planned' }
    }
  },
  {
    id: 'notif_adm_5',
    category: 'academic',
    eventType: 'assignment_submitted',
    type: 'assignment_submitted',
    title: 'Assignment Submissions Ready for Grading',
    message: '4 students have submitted their Module 1 Exegesis papers in SOM-101.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    read: false,
    priority: 'normal',
    targetRole: 'admin',
    actionTab: 'courses',
    channelDelivery: {
      in_app: { delivered: true, deliveredAt: new Date().toISOString() },
      email: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      push: { enabled: false, status: 'disabled' },
      whatsapp: { enabled: false, status: 'planned' }
    }
  },
  {
    id: 'notif_adm_6',
    category: 'academic',
    eventType: 'lecturer_pending_grades',
    type: 'lecturer_pending_grades',
    title: 'Pending Grades Alert: SOM-104',
    message: 'Lecturer grades for Apostolic Governance Quiz #1 are pending evaluation beyond the 5-day SLA.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    read: false,
    priority: 'high',
    targetRole: 'admin',
    actionTab: 'courses',
    channelDelivery: {
      in_app: { delivered: true, deliveredAt: new Date().toISOString() },
      email: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      push: { enabled: true, status: 'sent', sentAt: new Date().toISOString() },
      whatsapp: { enabled: false, status: 'planned' }
    }
  }
];

let memoryPreferences: UserNotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };

/**
 * 1. GET /api/notifications
 * Retrieve notifications filtered by role, student identity, unread status, or category.
 */
notificationsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const role = (req.query.role as string) || 'all';
    const studentName = (req.query.studentName as string) || '';
    const category = req.query.category as string;
    const eventType = req.query.eventType as string;
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = parseInt(req.query.limit as string, 10) || 50;

    // Filter memory notifications
    let filtered = [...memoryNotifications];

    // Filter by role:
    if (role === 'student') {
      const studentUuid = (req.user?.studentRecordId || req.user?.studentId || req.user?.userId || '').toLowerCase();
      filtered = filtered.filter(n => {
        const isStudentTarget = n.targetRole === 'student' || n.targetRole === 'all' || !n.targetRole;
        if (!isStudentTarget) return false;
        // If notification is tied to a specific student UUID, match it strictly
        const targetStudentId = (((n as any).studentId || (n as any).student_id || (n as any).recipient || '') as string).toLowerCase();
        if (targetStudentId && targetStudentId !== 'all' && targetStudentId !== 'students') {
          return studentUuid ? targetStudentId === studentUuid : false;
        }
        return true;
      });
    } else if (role === 'admin' || role === 'teacher') {
      filtered = filtered.filter(n => n.targetRole === 'admin' || n.targetRole === 'teacher' || n.targetRole === 'all' || !n.targetRole);
    }

    if (unreadOnly) {
      filtered = filtered.filter(n => !n.read);
    }

    if (category && category !== 'all') {
      filtered = filtered.filter(n => n.category === category);
    }

    if (eventType && eventType !== 'all') {
      filtered = filtered.filter(n => n.eventType === eventType || n.type === eventType);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const result = filtered.slice(0, limit);
    const unreadCount = filtered.filter(n => !n.read).length;
    const urgentCount = filtered.filter(n => n.priority === 'urgent' && !n.read).length;

    res.json({
      success: true,
      notifications: result,
      stats: {
        total: filtered.length,
        unreadCount,
        urgentCount,
        byCategory: {
          academic: filtered.filter(n => n.category === 'academic').length,
          attendance: filtered.filter(n => n.category === 'attendance').length,
          financial: filtered.filter(n => n.category === 'financial').length,
          announcement: filtered.filter(n => n.category === 'announcement').length,
          enrollment: filtered.filter(n => n.category === 'enrollment').length,
          library: filtered.filter(n => n.category === 'library').length,
          system: filtered.filter(n => n.category === 'system').length
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 2. POST /api/notifications
 * Create and dispatch a new notification across In-App, Email, Push, and WhatsApp.
 */
notificationsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      category = 'system',
      eventType,
      title,
      message,
      targetRole = 'all',
      studentName,
      studentEmail,
      studentPhone,
      priority = 'normal',
      actionTab = 'home',
      actionUrl,
      metadata = {}
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'Title and message are required.' });
    }

    const definition = eventType && NOTIFICATION_DEFINITIONS[eventType] 
      ? NOTIFICATION_DEFINITIONS[eventType] 
      : null;

    const notifCategory = (definition?.category || category) as NotificationCategory;
    const notifPriority = (priority || definition?.defaultPriority || 'normal') as NotificationPriority;
    const notifTab = (actionTab || definition?.actionTab || 'home') as TabType;

    // Simulate multi-channel delivery
    const now = new Date().toISOString();
    const newNotification: CentralNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      category: notifCategory,
      eventType: eventType as NotificationEventType,
      type: eventType as NotificationEventType,
      title: title.trim(),
      message: message.trim(),
      createdAt: now,
      read: false,
      priority: notifPriority,
      targetRole: targetRole as any,
      studentName,
      studentEmail,
      studentPhone,
      actionTab: notifTab,
      actionUrl,
      metadata,
      channelDelivery: {
        in_app: { delivered: true, deliveredAt: now },
        email: { 
          enabled: true, 
          status: 'sent', 
          sentAt: now, 
          targetEmail: studentEmail || 'student@hteim.edu' 
        },
        push: { 
          enabled: true, 
          status: 'sent', 
          sentAt: now 
        },
        whatsapp: { 
          enabled: false, 
          status: 'planned', 
          targetPhone: studentPhone 
        }
      },
      deliveryLogs: [
        { channel: 'in_app', status: 'delivered', timestamp: now, details: 'In-app notification badge rendered' },
        { channel: 'email', status: 'sent', timestamp: now, details: 'Dispatched via transactional email queue' },
        { channel: 'push', status: 'sent', timestamp: now, details: 'Web push event broadcasted' },
        { channel: 'whatsapp', status: 'queued', timestamp: now, details: 'Staged in WhatsApp webhook queue (staged for future phase)' }
      ]
    };

    memoryNotifications.unshift(newNotification);

    res.status(201).json({
      success: true,
      notification: newNotification
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 3. PUT /api/notifications/:id/read or PATCH /api/notifications/:id
 * Mark a single notification as read or update fields.
 */
notificationsRouter.put('/:id/read', (req: Request, res: Response) => {
  const { id } = req.params;
  const notif = memoryNotifications.find(n => n.id === id);
  if (!notif) {
    return res.status(404).json({ success: false, error: 'Notification not found' });
  }
  notif.read = true;
  res.json({ success: true, notification: notif });
});

notificationsRouter.patch('/:id/read', (req: Request, res: Response) => {
  const { id } = req.params;
  const notif = memoryNotifications.find(n => n.id === id);
  if (!notif) {
    return res.status(404).json({ success: false, error: 'Notification not found' });
  }
  notif.read = true;
  res.json({ success: true, notification: notif });
});

notificationsRouter.patch('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const notifIndex = memoryNotifications.findIndex(n => n.id === id);
  if (notifIndex === -1) {
    return res.status(404).json({ success: false, error: 'Notification not found' });
  }
  const existing = memoryNotifications[notifIndex];
  const updated = { ...existing, ...req.body, id: existing.id };
  memoryNotifications[notifIndex] = updated;
  res.json({ success: true, notification: updated });
});


/**
 * 4. PUT /api/notifications/read-all
 * Mark all notifications as read for a given role or user.
 */
notificationsRouter.put('/read-all', (req: Request, res: Response) => {
  const role = req.user?.role || (req.body.role as string) || (req.query.role as string) || 'all';
  const studentUuid = (req.user?.studentRecordId || req.user?.studentId || req.user?.userId || '').toLowerCase();

  memoryNotifications = memoryNotifications.map(n => {
    if (role === 'student') {
      if (n.targetRole === 'student' || n.targetRole === 'all') {
        const targetStudentId = (((n as any).studentId || (n as any).student_id || (n as any).recipient || '') as string).toLowerCase();
        if (!targetStudentId || targetStudentId === 'all' || targetStudentId === 'students' || (studentUuid && targetStudentId === studentUuid)) {
          return { ...n, read: true };
        }
      }
      return n;
    } else if (role === 'admin' || role === 'teacher') {
      if (n.targetRole === 'admin' || n.targetRole === 'teacher' || n.targetRole === 'all') {
        return { ...n, read: true };
      }
      return n;
    }
    return { ...n, read: true };
  });

  res.json({ success: true, message: 'All notifications marked as read' });
});

/**
 * 5. DELETE /api/notifications/:id
 * Remove a notification.
 */
notificationsRouter.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLength = memoryNotifications.length;
  memoryNotifications = memoryNotifications.filter(n => n.id !== id);
  if (memoryNotifications.length === initialLength) {
    return res.status(404).json({ success: false, error: 'Notification not found' });
  }
  res.json({ success: true, message: 'Notification deleted' });
});

/**
 * 6. GET /api/notifications/preferences
 * Return user channel and alert preferences.
 */
notificationsRouter.get('/preferences', (req: Request, res: Response) => {
  res.json({
    success: true,
    preferences: memoryPreferences,
    channels: {
      in_app: { active: true, label: 'In-App Notifications', description: 'Real-time badge and dropdown trays' },
      email: { active: true, label: 'Email Notifications', description: 'Transactional updates sent to student email' },
      push: { active: true, label: 'Web Push Notifications', description: 'Desktop and Android PWA system pushes' },
      whatsapp: { active: false, label: 'WhatsApp Messaging', description: 'Staged for upcoming phase with Meta Cloud API' }
    }
  });
});

/**
 * 7. PUT /api/notifications/preferences
 * Update user channel and alert preferences.
 */
notificationsRouter.put('/preferences', (req: Request, res: Response) => {
  const { preferences } = req.body;
  if (preferences && typeof preferences === 'object') {
    memoryPreferences = { ...memoryPreferences, ...preferences };
  }
  res.json({ success: true, preferences: memoryPreferences });
});

/**
 * 8. POST /api/notifications/test-dispatch
 * Dispatches a simulated notification for any of the 14 defined events
 * (8 student events + 6 administrator events) across delivery channels.
 */
notificationsRouter.post('/test-dispatch', (req: Request, res: Response) => {
  const { eventType, targetStudentName } = req.body;
  const def = NOTIFICATION_DEFINITIONS[eventType];

  if (!def) {
    return res.status(400).json({ 
      success: false, 
      error: `Unknown eventType '${eventType}'. Available: ${Object.keys(NOTIFICATION_DEFINITIONS).join(', ')}` 
    });
  }

  const now = new Date().toISOString();
  const sampleTitles: Record<string, string> = {
    // Student
    new_assignment: 'New Assignment: Biblical Hermeneutics Essay',
    assignment_deadline: 'Deadline Approaching: Exegesis Paper Due in 24 Hours',
    grade_published: 'Grade Published: Evangelism Field Practicum (95% - High Distinction)',
    attendance_warning: 'Urgent Attendance Warning: Attendance Rate Dropped Below 75%',
    payment_reminder: 'Tuition Payment Reminder: 2026 Semester 1 Installment',
    new_announcement: 'Special Apostolic Convocation with Apostle Dr. Kendell Pierre',
    registration_confirmation: 'Registration Confirmed: SOM-101 Biblical Hermeneutics',
    library_resource_added: 'New Library Textbook Added: Exegesis & Doctrinal Hermeneutics',
    // Administrator
    new_enrollment: 'New Student Application: Pastor David Warner (Level 1)',
    payment_received: 'Tuition Payment Verified: $250.00 from Abigail Selkridge',
    outstanding_balance: 'Past Due Balance Flagged: 3 Students Overdue ($750.00 Total)',
    attendance_issue: 'Critical Attendance Flag: Pastor Christy Arthur (66.7%)',
    assignment_submitted: 'New Student Submission: SOM-101 Hermeneutics Paper',
    lecturer_pending_grades: 'Faculty Alert: SOM-104 Quiz Evaluations Pending Beyond 5 Days'
  };

  const sampleMessages: Record<string, string> = {
    new_assignment: 'A new 1,500-word exegesis paper has been posted by Pastor Samuel Selkridge. Due on the upcoming lecture date.',
    assignment_deadline: 'Your assignment is due tomorrow at 11:59 PM EST. Submit your document in the assignments portal to avoid late deductions.',
    grade_published: 'Your submitted assignment has been evaluated and reviewed by the academic faculty. Excellent work!',
    attendance_warning: 'Your recorded attendance has fallen to 66.7%, which is below the mandatory 75% institutional requirement.',
    payment_reminder: 'Your semester tuition installment balance is due. Please review your statement in the payments tab.',
    new_announcement: 'Join the ministerial leadership live on Zoom or in the Main Sanctuary for our monthly convocation.',
    registration_confirmation: 'Your registration for 2026 Semester 1 is active. Access your course materials in the catalog.',
    library_resource_added: 'A new ministerial study guide and scripture handout is available for download in the digital library.',
    new_enrollment: 'A prospective minister has applied for the upcoming academic cycle. Review credentials in the students tab.',
    payment_received: 'Receipt #RCP-2026-089 has been generated and posted to student ledger.',
    outstanding_balance: 'Tuition balance reminders have been queued for students with overdue balances.',
    attendance_issue: 'Student attendance is below the 75% satisfactory threshold and requires pastoral intervention.',
    assignment_submitted: 'Student has uploaded their coursework for faculty evaluation and rubric grading.',
    lecturer_pending_grades: 'Faculty grading queue exceeds target response window. Please review course offering gradebook.'
  };

  const testNotif: CentralNotification = {
    id: `test_${eventType}_${Date.now()}`,
    category: def.category,
    eventType: eventType as NotificationEventType,
    type: eventType as NotificationEventType,
    title: sampleTitles[eventType] || def.label,
    message: sampleMessages[eventType] || def.description,
    createdAt: now,
    read: false,
    priority: def.defaultPriority,
    targetRole: def.role === 'both' ? 'all' : def.role,
    studentName: targetStudentName || (def.role === 'student' ? 'Abigail Selkridge' : undefined),
    actionTab: def.actionTab,
    channelDelivery: {
      in_app: { delivered: true, deliveredAt: now },
      email: { enabled: true, status: 'sent', sentAt: now },
      push: { enabled: true, status: 'sent', sentAt: now },
      whatsapp: { enabled: false, status: 'planned' }
    },
    deliveryLogs: [
      { channel: 'in_app', status: 'delivered', timestamp: now, details: 'In-app alert rendered' },
      { channel: 'email', status: 'sent', timestamp: now, details: 'Email notification simulated' },
      { channel: 'push', status: 'sent', timestamp: now, details: 'Push broadcast simulated' },
      { channel: 'whatsapp', status: 'queued', timestamp: now, details: 'Staged for future WhatsApp phase' }
    ]
  };

  memoryNotifications.unshift(testNotif);

  res.json({
    success: true,
    notification: testNotif,
    message: `Dispatched test notification for '${def.label}'`
  });
});
