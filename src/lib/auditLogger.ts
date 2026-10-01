export type AuditLogCategory = 
  | 'Grade Adjustment'
  | 'Attendance Override'
  | 'Payment Entry'
  | 'Student Record'
  | 'Assignment Action'
  | 'Quiz Management'
  | 'Quiz Completed'
  | 'AI Evaluation Override'
  | 'System Settings'
  | 'Backup & Data';

export type AuditActionCode = 
  | 'UPDATE_GRADE'
  | 'EDIT_ATTENDANCE'
  | 'RECORD_PAYMENT'
  | 'UPDATE_STUDENT_PROFILE'
  | 'CANCEL_ENROLLMENT'
  | 'OVERRIDE_AI_EVALUATION'
  | 'CREATE_ASSIGNMENT'
  | 'UPDATE_ASSIGNMENT'
  | 'SUBMIT_ASSIGNMENT'
  | 'CREATE_INVOICE'
  | 'APPLY_ADJUSTMENT'
  | 'ADD_STUDENT_NOTE'
  | 'EXCUSED_ABSENCE_APPROVAL'
  | 'ANNOUNCEMENT_PUBLISHED'
  | 'RESTORE_BACKUP'
  | 'DATA_EXPORT'
  | 'OTHER';

import { UserRole } from '../types/rbac';
import { logger } from './logger';

export type AuditLogEntry = {
  id: string;
  audit_id?: string;
  auditId?: string;
  timestamp: string;
  actor_user_id?: string | null;
  actorUserId?: string | null;
  actor_role?: string;
  actorRole?: string;
  userEmail?: string;
  actor: string;
  role: UserRole | 'admin' | 'teacher' | 'student' | 'system' | 'finance' | string;
  action: AuditActionCode;
  entity_type?: string;
  entityType?: string;
  entity_id?: string;
  entityId?: string;
  old_values?: any;
  oldValues?: any;
  new_values?: any;
  newValues?: any;
  changed_fields?: string[];
  changedFields?: string[];
  reason?: string | null;
  ip_address?: string | null;
  ipAddress?: string | null;
  user_agent?: string | null;
  userAgent?: string | null;
  request_id?: string | null;
  requestId?: string | null;
  actionCategory: AuditLogCategory;
  actionTitle: string;
  details: string;
  targetStudent?: string;
  studentId?: string;
  course?: string;
  oldValue?: string | number | null;
  newValue?: string | number | null;
  ipOrDevice?: string;
  metadata?: Record<string, any>;
};

const STORAGE_KEY = 'hteim_audit_logs';

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-101',
    timestamp: '2026-09-06 14:32:00',
    userEmail: 'admin@hteim.org',
    actor: 'Administrator (Dean Roberts)',
    role: 'admin',
    action: 'UPDATE_GRADE',
    actionCategory: 'Grade Adjustment',
    actionTitle: 'Student Exam Grade Modified',
    details: 'Updated grade for John Doe in Biblical Hermeneutics based on regrade request.',
    targetStudent: 'John Doe',
    course: 'Biblical Hermeneutics',
    oldValue: 72,
    newValue: 78,
    ipOrDevice: 'Web Admin Session (192.168.1.10)'
  },
  {
    id: 'log-102',
    timestamp: '2026-09-06 12:15:45',
    userEmail: 'lecturer.smith@hteim.org',
    actor: 'Lecturer Dr. Smith',
    role: 'teacher',
    action: 'EDIT_ATTENDANCE',
    actionCategory: 'Attendance Override',
    actionTitle: 'Attendance Record Overridden',
    details: 'Overrode attendance for Kezia John for Day 12 from Absent to Present (Excused Ministry Trip).',
    targetStudent: 'Kezia John',
    course: 'Module 1: Foundations of Theology',
    oldValue: 'Absent',
    newValue: 'Present (Excused)',
    ipOrDevice: 'Faculty Tablet Session'
  },
  {
    id: 'log-103',
    timestamp: '2026-09-05 16:40:22',
    userEmail: 'finance@hteim.org',
    actor: 'Sister Clara (Finance Officer)',
    role: 'finance_officer',
    action: 'RECORD_PAYMENT',
    actionCategory: 'Payment Entry',
    actionTitle: 'Tuition Installment Payment Recorded',
    details: 'Recorded $500.00 tuition payment for Afeshia Burke via Credit Card. Remaining balance: $200.00.',
    targetStudent: 'Afeshia Burke',
    course: 'Level 1: Foundation Certificate',
    oldValue: '$700.00 Balance',
    newValue: '$200.00 Balance ($500.00 Paid)',
    ipOrDevice: 'Finance Workstation'
  },
  {
    id: 'log-104',
    timestamp: '2026-09-05 10:05:12',
    userEmail: 'admin@hteim.org',
    actor: 'Registrar Office',
    role: 'registrar',
    action: 'UPDATE_STUDENT_PROFILE',
    actionCategory: 'Student Record',
    actionTitle: 'Student Academic Track Upgraded',
    details: 'Updated academic level for Sister Maria Santos from Foundation Certificate to Intermediate Diploma.',
    targetStudent: 'Sister Maria Santos',
    course: 'Level 2: Intermediate Diploma',
    oldValue: 'Level 1: Foundation',
    newValue: 'Level 2: Diploma',
    ipOrDevice: 'Registrar Terminal'
  },
  {
    id: 'log-105',
    timestamp: '2026-09-04 15:20:00',
    userEmail: 'admin@hteim.org',
    actor: 'Administrator (Dean Roberts)',
    role: 'admin',
    action: 'CANCEL_ENROLLMENT',
    actionCategory: 'Student Record',
    actionTitle: 'Student Enrollment Status Changed',
    details: 'Cancelled active enrollment for Marcus Vance due to formal deferral request.',
    targetStudent: 'Marcus Vance',
    course: 'Module 3: Apostolic Leadership',
    oldValue: 'Active Enrolled',
    newValue: 'Cancelled / Inactive',
    ipOrDevice: 'Web Admin Session'
  },
  {
    id: 'log-106',
    timestamp: '2026-09-04 09:12:30',
    userEmail: 'lecturer.smith@hteim.org',
    actor: 'Lecturer Dr. Smith',
    role: 'teacher',
    action: 'OVERRIDE_AI_EVALUATION',
    actionCategory: 'AI Evaluation Override',
    actionTitle: 'AI Essay Evaluation Overridden by Faculty',
    details: 'Overrode AI automated evaluation score for Alicia Noray Bowles on "Homiletics & Exegetical Exposition". Faculty added manual feedback.',
    targetStudent: 'Alicia Noray Bowles',
    course: 'Homiletics & Exegetical Exposition',
    oldValue: '82% (AI Score)',
    newValue: '92% (Faculty Overridden)',
    ipOrDevice: 'Faculty Tablet Session'
  },
  {
    id: 'log-107',
    timestamp: '2026-09-03 18:30:00',
    userEmail: 'system@hteim.org',
    actor: 'System Auto-Sync',
    role: 'system',
    action: 'OTHER',
    actionCategory: 'System Settings',
    actionTitle: 'Google Sheets Attendance Mirror Sync',
    details: 'Successfully synchronized 18 attendance worksheets from Google Sheets master registry.',
    ipOrDevice: 'Automated Cloud Worker'
  }
];

export function getAuditLogs(): AuditLogEntry[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    logger.error('Failed to parse audit logs from storage:', e);
  }

  // Initialize with sample records if empty
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
  } catch (e) {
    // Ignore storage write errors
  }
  return INITIAL_AUDIT_LOGS;
}

export function logActivity(entry: {
  userEmail?: string;
  actorUserId?: string | null;
  actor_user_id?: string | null;
  actor?: string;
  role?: UserRole | 'admin' | 'teacher' | 'student' | 'system' | 'finance' | string;
  actorRole?: string;
  actor_role?: string;
  action?: AuditActionCode | string;
  entityType?: string;
  entity_type?: string;
  entityId?: string;
  entity_id?: string;
  actionCategory?: AuditLogCategory;
  actionTitle: string;
  details: string;
  targetStudent?: string;
  studentId?: string;
  course?: string;
  oldValue?: string | number | null;
  newValue?: string | number | null;
  oldValues?: any;
  old_values?: any;
  newValues?: any;
  new_values?: any;
  changedFields?: string[];
  changed_fields?: string[];
  reason?: string | null;
  ipAddress?: string | null;
  ip_address?: string | null;
  userAgent?: string | null;
  user_agent?: string | null;
  requestId?: string | null;
  request_id?: string | null;
  ipOrDevice?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}): AuditLogEntry {
  const logs = getAuditLogs();
  
  const now = new Date();
  const formattedTime = entry.timestamp || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  // Auto-deduce action code if not explicitly passed
  let resolvedAction: AuditActionCode = (entry.action as AuditActionCode) || 'OTHER';
  if (!entry.action) {
    if (entry.actionCategory === 'Grade Adjustment') resolvedAction = 'UPDATE_GRADE';
    else if (entry.actionCategory === 'Attendance Override') resolvedAction = 'EDIT_ATTENDANCE';
    else if (entry.actionCategory === 'Payment Entry') resolvedAction = 'RECORD_PAYMENT';
    else if (entry.actionCategory === 'Student Record') resolvedAction = 'UPDATE_STUDENT_PROFILE';
    else if (entry.actionCategory === 'AI Evaluation Override') resolvedAction = 'OVERRIDE_AI_EVALUATION';
    else if (entry.actionCategory === 'Assignment Action') resolvedAction = 'CREATE_ASSIGNMENT';
  }

  // Auto-deduce category if not explicitly passed
  let resolvedCategory: AuditLogCategory = entry.actionCategory || 'System Settings';
  if (!entry.actionCategory) {
    if (resolvedAction === 'UPDATE_GRADE') resolvedCategory = 'Grade Adjustment';
    else if (resolvedAction === 'EDIT_ATTENDANCE') resolvedCategory = 'Attendance Override';
    else if (resolvedAction === 'RECORD_PAYMENT' || resolvedAction === 'CREATE_INVOICE' || resolvedAction === 'APPLY_ADJUSTMENT') resolvedCategory = 'Payment Entry';
    else if (resolvedAction === 'UPDATE_STUDENT_PROFILE' || resolvedAction === 'CANCEL_ENROLLMENT' || resolvedAction === 'ADD_STUDENT_NOTE') resolvedCategory = 'Student Record';
    else if (resolvedAction === 'OVERRIDE_AI_EVALUATION') resolvedCategory = 'AI Evaluation Override';
    else if (resolvedAction === 'CREATE_ASSIGNMENT' || resolvedAction === 'UPDATE_ASSIGNMENT' || resolvedAction === 'SUBMIT_ASSIGNMENT') resolvedCategory = 'Assignment Action';
    else if (resolvedAction === 'RESTORE_BACKUP' || resolvedAction === 'DATA_EXPORT') resolvedCategory = 'Backup & Data';
  }

  const logId = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const actorUserId = entry.actorUserId || entry.actor_user_id || entry.userEmail || null;
  const actorRole = entry.actorRole || entry.actor_role || entry.role || 'user';
  const entityType = entry.entityType || entry.entity_type || (entry.targetStudent ? 'student' : entry.course ? 'course' : 'system');
  const entityId = entry.entityId || entry.entity_id || entry.studentId || entry.course || 'system';

  const newLog: AuditLogEntry = {
    id: logId,
    audit_id: logId,
    auditId: logId,
    timestamp: formattedTime,
    actor_user_id: actorUserId,
    actorUserId: actorUserId,
    actor_role: actorRole,
    actorRole: actorRole,
    userEmail: entry.userEmail,
    actor: entry.actor || (entry.userEmail ? entry.userEmail.split('@')[0] : 'System'),
    role: actorRole,
    action: resolvedAction,
    entity_type: entityType,
    entityType: entityType,
    entity_id: entityId,
    entityId: entityId,
    old_values: entry.oldValues !== undefined ? entry.oldValues : entry.old_values !== undefined ? entry.old_values : entry.oldValue,
    oldValues: entry.oldValues !== undefined ? entry.oldValues : entry.old_values !== undefined ? entry.old_values : entry.oldValue,
    new_values: entry.newValues !== undefined ? entry.newValues : entry.new_values !== undefined ? entry.new_values : entry.newValue,
    newValues: entry.newValues !== undefined ? entry.newValues : entry.new_values !== undefined ? entry.new_values : entry.newValue,
    changed_fields: entry.changedFields || entry.changed_fields || [],
    changedFields: entry.changedFields || entry.changed_fields || [],
    reason: entry.reason || entry.details || null,
    ip_address: entry.ipAddress || entry.ip_address || entry.ipOrDevice || null,
    ipAddress: entry.ipAddress || entry.ip_address || entry.ipOrDevice || null,
    user_agent: entry.userAgent || entry.user_agent || null,
    userAgent: entry.userAgent || entry.user_agent || null,
    request_id: entry.requestId || entry.request_id || null,
    requestId: entry.requestId || entry.request_id || null,
    actionCategory: resolvedCategory,
    actionTitle: entry.actionTitle,
    details: entry.details,
    targetStudent: entry.targetStudent,
    studentId: entry.studentId,
    course: entry.course,
    oldValue: entry.oldValue,
    newValue: entry.newValue,
    ipOrDevice: entry.ipOrDevice || 'Web Portal Session',
    metadata: entry.metadata
  };

  const updatedLogs = [newLog, ...logs];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
    // Dispatch custom window event so listening components update real-time
    window.dispatchEvent(new CustomEvent('hteim_audit_log_updated', { detail: newLog }));
  } catch (e) {
    logger.error('Failed to save audit log:', e);
  }

  return newLog;
}

/**
 * Express helper for recording academic audit log entries cleanly with type safety
 */
export function logAuditEvent(params: {
  userEmail?: string;
  actor: string;
  role: string;
  action: AuditActionCode;
  actionCategory?: AuditLogCategory;
  actionTitle: string;
  targetStudent?: string;
  studentId?: string;
  course?: string;
  oldValue?: string | number | null;
  newValue?: string | number | null;
  details: string;
  metadata?: Record<string, any>;
}): AuditLogEntry {
  return logActivity(params);
}

export function clearAuditLogs(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    window.dispatchEvent(new CustomEvent('hteim_audit_log_updated'));
  } catch (e) {
    logger.error('Failed to clear audit logs:', e);
  }
}

export function pruneAuditLogs(maxCount: number = 100): number {
  try {
    const logs = getAuditLogs();
    if (logs.length > maxCount) {
      const pruned = logs.slice(0, maxCount);
      const deletedCount = logs.length - maxCount;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
      window.dispatchEvent(new CustomEvent('hteim_audit_log_updated'));
      return deletedCount;
    }
    return 0;
  } catch (e) {
    logger.error('Failed to prune audit logs:', e);
    return 0;
  }
}
