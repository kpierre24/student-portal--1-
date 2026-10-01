import { TabType } from '../types';

/**
 * ============================================================================
 * NOTIFICATION ENGINE DATA MODELS & TYPES
 * HTEIM School of Ministry
 * ============================================================================
 */

// Delivery Channels: In-App (active), Email (ready), Push (ready), WhatsApp (planned), SMS (optional)
export type NotificationChannel = 'in_app' | 'email' | 'push' | 'whatsapp' | 'sms';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// Categories matching functional areas
export type NotificationCategory =
  | 'academic'
  | 'attendance'
  | 'financial'
  | 'announcement'
  | 'library'
  | 'enrollment'
  | 'system'
  // Legacy categories for backwards compatibility
  | 'assignment_due'
  | 'assignment_graded'
  | 'attendance_warning'
  | 'payment_due'
  | 'payment_received'
  | 'application_status';

// Student Notification Event Types (User Request Item 8)
export type StudentNotificationType =
  | 'new_assignment'
  | 'assignment_deadline'
  | 'grade_published'
  | 'attendance_warning'
  | 'payment_reminder'
  | 'new_announcement'
  | 'registration_confirmation'
  | 'library_resource_added';

// Administrator Notification Event Types (User Request Item 8)
export type AdminNotificationType =
  | 'new_enrollment'
  | 'payment_received'
  | 'outstanding_balance'
  | 'attendance_issue'
  | 'assignment_submitted'
  | 'lecturer_pending_grades';

export type NotificationEventType = 
  | StudentNotificationType 
  | AdminNotificationType 
  // Legacy types
  | 'due_date' 
  | 'past_due' 
  | 'graded' 
  | 'submission' 
  | 'general' 
  | 'at_risk_attendance' 
  | 'payment_past_due';

export interface ChannelPreferenceMap {
  in_app: boolean;
  email: boolean;
  push: boolean;
  whatsapp: boolean;
  sms?: boolean;
}

export type UserNotificationPreferences = Record<string, ChannelPreferenceMap>;

export interface DeliveryLog {
  channel: NotificationChannel;
  status: 'delivered' | 'sent' | 'queued' | 'failed' | 'skipped_disabled' | 'pending';
  timestamp: string;
  details?: string;
}

export interface ChannelDeliveryStatus {
  in_app: { delivered: boolean; deliveredAt?: string };
  email: { enabled: boolean; status: 'sent' | 'queued' | 'disabled' | 'pending'; sentAt?: string; targetEmail?: string };
  push: { enabled: boolean; status: 'sent' | 'queued' | 'disabled' | 'pending'; sentAt?: string };
  whatsapp: { enabled: boolean; status: 'planned' | 'queued' | 'disabled'; targetPhone?: string };
}

export interface CentralNotification {
  id: string;
  category: NotificationCategory;
  eventType?: NotificationEventType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  priority?: NotificationPriority;
  targetRole?: 'admin' | 'teacher' | 'student' | 'all';
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  assignmentId?: string;
  courseOfferingId?: string;
  actionTab?: TabType;
  actionUrl?: string;
  metadata?: Record<string, any>;
  deliveryLogs?: DeliveryLog[];
  channelDelivery?: ChannelDeliveryStatus;
  type?: NotificationEventType;
  channelSent?: ('portal' | 'in_app' | 'email' | 'push' | 'sms' | 'whatsapp')[];
}

export const NOTIFICATION_DEFINITIONS: Record<string, {
  label: string;
  description: string;
  role: 'student' | 'admin' | 'both';
  category: NotificationCategory;
  defaultPriority: NotificationPriority;
  icon: string;
  actionTab: TabType;
}> = {
  // --- Student Notifications ---
  new_assignment: {
    label: 'New Assignment',
    description: 'Alerts student when faculty posts a new homework or essay exegesis',
    role: 'student',
    category: 'academic',
    defaultPriority: 'normal',
    icon: 'FileText',
    actionTab: 'courses'
  },
  assignment_deadline: {
    label: 'Assignment Deadline Approaching',
    description: 'Reminder 24-48 hours before an assignment or exam is due',
    role: 'student',
    category: 'academic',
    defaultPriority: 'high',
    icon: 'Clock',
    actionTab: 'courses'
  },
  grade_published: {
    label: 'Grade Published',
    description: 'Instant notification when an instructor evaluates coursework or exams',
    role: 'student',
    category: 'academic',
    defaultPriority: 'normal',
    icon: 'Award',
    actionTab: 'courses'
  },
  attendance_warning: {
    label: 'Attendance Warning',
    description: 'Urgent notification when student attendance rate falls below the 75% threshold',
    role: 'student',
    category: 'attendance',
    defaultPriority: 'urgent',
    icon: 'AlertTriangle',
    actionTab: 'attendance'
  },
  payment_reminder: {
    label: 'Tuition Payment Reminder',
    description: 'Upcoming semester tuition installment and balance notice',
    role: 'student',
    category: 'financial',
    defaultPriority: 'high',
    icon: 'DollarSign',
    actionTab: 'payments'
  },
  new_announcement: {
    label: 'New Ministry Announcement',
    description: 'Broadcasts from HTEIM Leadership, class relocations, or live service broadcasts',
    role: 'student',
    category: 'announcement',
    defaultPriority: 'normal',
    icon: 'Radio',
    actionTab: 'home'
  },
  registration_confirmation: {
    label: 'Course Registration Confirmation',
    description: 'Confirmation of semester term course offering enrollment',
    role: 'student',
    category: 'enrollment',
    defaultPriority: 'normal',
    icon: 'CheckCircle2',
    actionTab: 'courses'
  },
  library_resource_added: {
    label: 'Library Resource Added',
    description: 'New ministerial textbook, commentary PDF, or lecture handout uploaded',
    role: 'student',
    category: 'library',
    defaultPriority: 'low',
    icon: 'BookOpen',
    actionTab: 'library'
  },

  // --- Administrator Notifications ---
  new_enrollment: {
    label: 'New Student Enrollment',
    description: 'Alerts administration when a student submits an application or registers',
    role: 'admin',
    category: 'enrollment',
    defaultPriority: 'normal',
    icon: 'UserCheck',
    actionTab: 'students'
  },
  payment_received: {
    label: 'Tuition Payment Received',
    description: 'Notifies treasury and admin when student pays tuition via bank, card, or cash',
    role: 'admin',
    category: 'financial',
    defaultPriority: 'normal',
    icon: 'DollarSign',
    actionTab: 'payments'
  },
  outstanding_balance: {
    label: 'Outstanding Tuition Balance',
    description: 'Flags students with overdue tuition balances requiring follow-up',
    role: 'admin',
    category: 'financial',
    defaultPriority: 'high',
    icon: 'AlertCircle',
    actionTab: 'payments'
  },
  attendance_issue: {
    label: 'At-Risk Attendance Issue',
    description: 'Flags students whose attendance has dropped into critical (<= 50%) or at-risk (< 75%) status',
    role: 'admin',
    category: 'attendance',
    defaultPriority: 'urgent',
    icon: 'AlertTriangle',
    actionTab: 'attendance'
  },
  assignment_submitted: {
    label: 'Assignment Submitted',
    description: 'Notifies lecturers and faculty when a student submits coursework for evaluation',
    role: 'admin',
    category: 'academic',
    defaultPriority: 'normal',
    icon: 'FileUp',
    actionTab: 'courses'
  },
  lecturer_pending_grades: {
    label: 'Lecturer Pending Grades Alert',
    description: 'Alerts administration when a lecturer has ungraded assignments past the grading window',
    role: 'admin',
    category: 'academic',
    defaultPriority: 'high',
    icon: 'Clock',
    actionTab: 'courses'
  }
};

export const CATEGORY_LABELS: Record<string, { label: string; description: string; icon: string }> = {
  academic: {
    label: 'Academic & Curriculum',
    description: 'Course offerings, homework, exegesis papers, and faculty evaluations',
    icon: 'GraduationCap'
  },
  attendance: {
    label: 'Attendance Alerts',
    description: 'Threshold warnings (< 75%), session rosters, and absence alerts',
    icon: 'Clock'
  },
  financial: {
    label: 'Tuition & Payments',
    description: 'Tuition statements, receipts, installment reminders, and balances',
    icon: 'DollarSign'
  },
  announcement: {
    label: 'Ministry Broadcasts',
    description: 'School-wide announcements, live stream links, and special convocations',
    icon: 'Radio'
  },
  enrollment: {
    label: 'Admissions & Enrollment',
    description: 'Student registration confirmations and cohort level placement',
    icon: 'UserCheck'
  },
  library: {
    label: 'Library & Resources',
    description: 'Theological syllabi, study guides, and digital books',
    icon: 'BookOpen'
  },
  system: {
    label: 'System & Security',
    description: 'Database synchronization, cloud backups, and security events',
    icon: 'Shield'
  },
  // Backwards compatibility keys
  assignment_due: {
    label: 'Assignment Due Dates',
    description: 'Upcoming homework and quiz due date reminders',
    icon: 'Clock'
  },
  assignment_graded: {
    label: 'Grading & Feedback',
    description: 'Alerts when homework or exams are evaluated by faculty',
    icon: 'Award'
  },
  attendance_warning: {
    label: 'Attendance Alerts',
    description: 'Notifications when attendance status changes or drops',
    icon: 'AlertCircle'
  },
  payment_due: {
    label: 'Tuition Payment Due',
    description: 'Upcoming installment and overdue balance reminders',
    icon: 'DollarSign'
  },
  payment_received: {
    label: 'Payment Receipts',
    description: 'Confirmations when tuition payments are processed and verified',
    icon: 'CheckCircle'
  },
  application_status: {
    label: 'Enrollment & Application Status',
    description: 'Status updates regarding student registration and level placement',
    icon: 'UserCheck'
  }
};

export const DEFAULT_NOTIFICATION_PREFERENCES: UserNotificationPreferences = {
  new_assignment: { in_app: true, email: true, push: true, whatsapp: false },
  assignment_deadline: { in_app: true, email: true, push: true, whatsapp: false },
  grade_published: { in_app: true, email: true, push: true, whatsapp: false },
  attendance_warning: { in_app: true, email: true, push: true, whatsapp: false },
  payment_reminder: { in_app: true, email: true, push: true, whatsapp: false },
  new_announcement: { in_app: true, email: true, push: true, whatsapp: false },
  registration_confirmation: { in_app: true, email: true, push: true, whatsapp: false },
  library_resource_added: { in_app: true, email: false, push: false, whatsapp: false },
  new_enrollment: { in_app: true, email: true, push: true, whatsapp: false },
  payment_received: { in_app: true, email: true, push: true, whatsapp: false },
  outstanding_balance: { in_app: true, email: true, push: true, whatsapp: false },
  attendance_issue: { in_app: true, email: true, push: true, whatsapp: false },
  assignment_submitted: { in_app: true, email: true, push: false, whatsapp: false },
  lecturer_pending_grades: { in_app: true, email: true, push: true, whatsapp: false },
  // Categories
  academic: { in_app: true, email: true, push: true, whatsapp: false },
  attendance: { in_app: true, email: true, push: true, whatsapp: false },
  financial: { in_app: true, email: true, push: true, whatsapp: false },
  announcement: { in_app: true, email: true, push: true, whatsapp: false },
  enrollment: { in_app: true, email: true, push: true, whatsapp: false },
  library: { in_app: true, email: false, push: false, whatsapp: false },
  system: { in_app: true, email: false, push: false, whatsapp: false }
};
