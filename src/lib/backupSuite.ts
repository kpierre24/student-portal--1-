import { getAuditLogs, logActivity, AuditLogEntry } from './auditLogger';
import { INITIAL_PAYMENTS, INITIAL_ASSIGNMENTS, INITIAL_SUBMISSIONS } from '../data/initialPortalData';
import { logger } from './logger';

export type FullBackupBundle = {
  version: string;
  exportedAt: string;
  institution: string;
  exportedBy: string;
  data: {
    students?: any[];
    attendanceRecords?: any[];
    customAssignments?: any[];
    assignmentSubmissions?: any[];
    paymentLedgers?: any[];
    rubricScores?: Record<string, any>;
    notifications?: any[];
    messages?: any[];
    auditLogs?: AuditLogEntry[];
    settings?: Record<string, any>;
  };
};

export function collectAllPortalData(exportedBy: string = 'Administrator'): FullBackupBundle {
  let attendanceRecords: any[] = [];
  try {
    const saved = localStorage.getItem('attendanceRecords');
    if (saved) attendanceRecords = JSON.parse(saved);
  } catch (e) {}

  let customAssignments: any[] = INITIAL_ASSIGNMENTS;
  try {
    const saved = localStorage.getItem('hteim_custom_assignments');
    if (saved) customAssignments = JSON.parse(saved);
  } catch (e) {}

  let assignmentSubmissions: any[] = INITIAL_SUBMISSIONS;
  try {
    const saved = localStorage.getItem('hteim_assignment_submissions');
    if (saved) assignmentSubmissions = JSON.parse(saved);
  } catch (e) {}

  let paymentLedgers: any[] = INITIAL_PAYMENTS;
  try {
    const saved = localStorage.getItem('hteim_student_payments');
    if (saved) paymentLedgers = JSON.parse(saved);
  } catch (e) {}

  let rubricScores: Record<string, any> = {};
  try {
    const saved = localStorage.getItem('hteim_rubric_scores');
    if (saved) rubricScores = JSON.parse(saved);
  } catch (e) {}

  let notifications: any[] = [];
  try {
    const saved = localStorage.getItem('hteim_app_notifications');
    if (saved) notifications = JSON.parse(saved);
  } catch (e) {}

  let messages: any[] = [];
  try {
    const saved = localStorage.getItem('hteim_app_messages');
    if (saved) messages = JSON.parse(saved);
  } catch (e) {}

  let settings: Record<string, any> = {};
  try {
    settings = {
      atRiskThreshold: localStorage.getItem('atRiskThreshold') || '75',
      satisfactoryThreshold: localStorage.getItem('satisfactoryThreshold') || '85',
      autoSyncInterval: localStorage.getItem('autoSyncInterval') || '0',
      syncOnTabFocus: localStorage.getItem('syncOnTabFocus') || 'true',
      themeMode: localStorage.getItem('themeMode') || 'light',
      hteim_passing_score: localStorage.getItem('hteim_passing_score') || '70',
      hteim_credit_hours_default: localStorage.getItem('hteim_credit_hours_default') || '3',
      hteim_tuition_per_credit: localStorage.getItem('hteim_tuition_per_credit') || '150',
      hteim_default_tuition_amount: localStorage.getItem('hteim_default_tuition_amount') || '1500',
      hteim_late_fee_amount: localStorage.getItem('hteim_late_fee_amount') || '50',
      hteim_installment_plan_term: localStorage.getItem('hteim_installment_plan_term') || '3',
      hteim_inst_address: localStorage.getItem('hteim_inst_address') || '124 Ministry Lane, NY 10001',
      hteim_inst_phone: localStorage.getItem('hteim_inst_phone') || '+1 (555) 777-1212',
      hteim_inst_email: localStorage.getItem('hteim_inst_email') || 'schoolofministry@hteim.org',
      hteim_authorized_signature: localStorage.getItem('hteim_authorized_signature') || 'Apostle Kendell Pierre',
      hteim_allow_student_attendance_self_report: localStorage.getItem('hteim_allow_student_attendance_self_report') || 'false',
      hteim_enable_stripe_playground_mode: localStorage.getItem('hteim_enable_stripe_playground_mode') || 'true',
      hteim_developer_mode: localStorage.getItem('hteim_developer_mode') || 'false'
    };
  } catch (e) {}

  const auditLogs = getAuditLogs();

  return {
    version: '2.5.0',
    exportedAt: new Date().toISOString(),
    institution: "Heaven Touching Earth Int'l Ministries (HTEIM) School of Ministry",
    exportedBy,
    data: {
      attendanceRecords,
      customAssignments,
      assignmentSubmissions,
      paymentLedgers,
      rubricScores,
      notifications,
      messages,
      auditLogs,
      settings
    }
  };
}

export function exportFullBackupJSON(exportedBy: string = 'Administrator'): void {
  const bundle = collectAllPortalData(exportedBy);
  const jsonString = JSON.stringify(bundle, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const dateStr = new Date().toISOString().split('T')[0];
  const link = document.createElement('a');
  link.href = url;
  link.download = `HTEIM_School_Of_Ministry_Backup_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  logActivity({
    actor: exportedBy,
    role: 'admin',
    actionCategory: 'Backup & Data',
    actionTitle: 'Full System JSON Backup Exported',
    details: `Exported full database backup file containing grade, attendance, payment, and audit logs.`
  });
}

export async function exportFullBackupZip(exportedBy: string = 'Administrator'): Promise<void> {
  const bundle = collectAllPortalData(exportedBy);
  const [{ default: JSZip }, { default: Papa }] = await Promise.all([
    import('jszip'),
    import('papaparse'),
  ]);
  const zip = new JSZip();

  // 1. JSON Master Backup File
  zip.file('HTEIM_Full_Database_Backup.json', JSON.stringify(bundle, null, 2));

  // 2. CSV Table 1: Attendance Records
  if (bundle.data.attendanceRecords && bundle.data.attendanceRecords.length > 0) {
    const attendanceCsvData = bundle.data.attendanceRecords.map((r: any) => ({
      'Student Candidate Name': r.name,
      'Class Date / Sheet': r.day,
      'Present Status': r.present ? 'Present' : 'Absent',
      'Score / Grade': r.scoreStr || 'N/A',
      'Log Timestamp': r.timestamp || 'N/A'
    }));
    zip.file('01_Attendance_Logs.csv', Papa.unparse(attendanceCsvData));
  }

  // 3. CSV Table 2: Custom Assignments & Submissions
  if (bundle.data.customAssignments && bundle.data.customAssignments.length > 0) {
    const assignmentsCsvData = bundle.data.customAssignments.map((a: any) => ({
      'Assignment ID': a.id,
      'Title': a.title,
      'Description': a.description,
      'Due Date': a.dueDate,
      'Max Points': a.maxPoints,
      'Category': a.category
    }));
    zip.file('02_Assignments_List.csv', Papa.unparse(assignmentsCsvData));
  }

  if (bundle.data.assignmentSubmissions && bundle.data.assignmentSubmissions.length > 0) {
    const submissionsCsvData = bundle.data.assignmentSubmissions.map((s: any) => ({
      'Submission ID': s.id,
      'Assignment ID': s.assignmentId,
      'Student Name': s.studentName,
      'Status': s.status,
      'Score': s.score !== undefined ? s.score : 'Not Graded',
      'Student Response Document': s.submittedFileName || 'N/A',
      'Teacher Corrected Document': s.correctedFileName || 'N/A',
      'Teacher Feedback': s.feedback || 'N/A',
      'Last Updated': s.updatedAt || 'N/A'
    }));
    zip.file('03_Assignment_Submissions.csv', Papa.unparse(submissionsCsvData));
  }

  // 4. CSV Table 3: Payment Ledger
  if (bundle.data.paymentLedgers && bundle.data.paymentLedgers.length > 0) {
    const paymentsCsvData = bundle.data.paymentLedgers.map((p: any) => ({
      'Payment Ledger ID': p.id,
      'Student Candidate Name': p.studentName,
      'Student ID': p.studentId,
      'Email': p.email,
      'Module Track': p.moduleTrack,
      'Total Tuition ($)': p.totalTuition,
      'Amount Paid ($)': p.amountPaid,
      'Balance Due ($)': Math.max(0, p.totalTuition - p.amountPaid),
      'Payment Status': p.status,
      'Last Payment Date': p.lastPaymentDate,
      'Payment Method': p.paymentMethod,
      'Receipt File': p.receiptName || 'N/A',
      'Notes': p.notes || ''
    }));
    zip.file('04_Tuition_Payment_Ledger.csv', Papa.unparse(paymentsCsvData));
  }

  // 5. CSV Table 4: Audit Logs
  if (bundle.data.auditLogs && bundle.data.auditLogs.length > 0) {
    const auditCsvData = bundle.data.auditLogs.map((l: AuditLogEntry) => ({
      'Log ID': l.id,
      'Timestamp': l.timestamp,
      'Actor': l.actor,
      'Role': l.role,
      'Action Category': l.actionCategory,
      'Action Title': l.actionTitle,
      'Details': l.details,
      'Target Student': l.targetStudent || 'N/A',
      'Session / Device': l.ipOrDevice || 'N/A'
    }));
    zip.file('05_Audit_Activity_Logs.csv', Papa.unparse(auditCsvData));
  }

  // Generate Zip Blob and trigger download
  const content = await zip.generateAsync({ type: 'blob' });
  const dateStr = new Date().toISOString().split('T')[0];
  const url = URL.createObjectURL(content);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `HTEIM_Full_Backup_Suite_${dateStr}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  logActivity({
    actor: exportedBy,
    role: 'admin',
    actionCategory: 'Backup & Data',
    actionTitle: 'Full Data & Excel Zip Suite Exported',
    details: `Exported multi-table ZIP archive containing JSON database and CSV exports for Attendance, Grades, Payments, and Audit Logs.`
  });
}

export function restoreFullBackupJSON(jsonData: string, actor: string = 'Administrator'): boolean {
  try {
    const bundle: FullBackupBundle = JSON.parse(jsonData);
    if (!bundle || typeof bundle !== 'object' || !bundle.data) {
      return false;
    }

    const d = bundle.data;

    if (Array.isArray(d.attendanceRecords)) {
      localStorage.setItem('attendanceRecords', JSON.stringify(d.attendanceRecords));
    }
    if (Array.isArray(d.customAssignments)) {
      localStorage.setItem('hteim_custom_assignments', JSON.stringify(d.customAssignments));
    }
    if (Array.isArray(d.assignmentSubmissions)) {
      localStorage.setItem('hteim_assignment_submissions', JSON.stringify(d.assignmentSubmissions));
    }
    if (Array.isArray(d.paymentLedgers)) {
      localStorage.setItem('hteim_student_payments', JSON.stringify(d.paymentLedgers));
    }
    if (d.rubricScores && typeof d.rubricScores === 'object') {
      localStorage.setItem('hteim_rubric_scores', JSON.stringify(d.rubricScores));
    }
    if (Array.isArray(d.notifications)) {
      localStorage.setItem('hteim_app_notifications', JSON.stringify(d.notifications));
    }
    if (Array.isArray(d.auditLogs)) {
      localStorage.setItem('hteim_audit_logs', JSON.stringify(d.auditLogs));
    }
    if (d.settings && typeof d.settings === 'object') {
      const s = d.settings;
      if (s.atRiskThreshold) localStorage.setItem('atRiskThreshold', s.atRiskThreshold.toString());
      if (s.satisfactoryThreshold) localStorage.setItem('satisfactoryThreshold', s.satisfactoryThreshold.toString());
      if (s.autoSyncInterval) localStorage.setItem('autoSyncInterval', s.autoSyncInterval.toString());
      if (s.syncOnTabFocus) localStorage.setItem('syncOnTabFocus', s.syncOnTabFocus.toString());
      if (s.themeMode) localStorage.setItem('themeMode', s.themeMode.toString());
      if (s.hteim_passing_score) localStorage.setItem('hteim_passing_score', s.hteim_passing_score.toString());
      if (s.hteim_credit_hours_default) localStorage.setItem('hteim_credit_hours_default', s.hteim_credit_hours_default.toString());
      if (s.hteim_tuition_per_credit) localStorage.setItem('hteim_tuition_per_credit', s.hteim_tuition_per_credit.toString());
      if (s.hteim_default_tuition_amount) localStorage.setItem('hteim_default_tuition_amount', s.hteim_default_tuition_amount.toString());
      if (s.hteim_late_fee_amount) localStorage.setItem('hteim_late_fee_amount', s.hteim_late_fee_amount.toString());
      if (s.hteim_installment_plan_term) localStorage.setItem('hteim_installment_plan_term', s.hteim_installment_plan_term.toString());
      if (s.hteim_inst_address) localStorage.setItem('hteim_inst_address', s.hteim_inst_address.toString());
      if (s.hteim_inst_phone) localStorage.setItem('hteim_inst_phone', s.hteim_inst_phone.toString());
      if (s.hteim_inst_email) localStorage.setItem('hteim_inst_email', s.hteim_inst_email.toString());
      if (s.hteim_authorized_signature) localStorage.setItem('hteim_authorized_signature', s.hteim_authorized_signature.toString());
      if (s.hteim_allow_student_attendance_self_report) localStorage.setItem('hteim_allow_student_attendance_self_report', s.hteim_allow_student_attendance_self_report.toString());
      if (s.hteim_enable_stripe_playground_mode) localStorage.setItem('hteim_enable_stripe_playground_mode', s.hteim_enable_stripe_playground_mode.toString());
      if (s.hteim_developer_mode) localStorage.setItem('hteim_developer_mode', s.hteim_developer_mode.toString());
    }

    logActivity({
      actor,
      role: 'admin',
      actionCategory: 'Backup & Data',
      actionTitle: 'Full Database Backup Restored',
      details: `Successfully restored database state from backup file exported at ${bundle.exportedAt || 'Unknown Date'}.`
    });

    return true;
  } catch (e) {
    logger.error('Backup restoration failed:', e);
    return false;
  }
}
