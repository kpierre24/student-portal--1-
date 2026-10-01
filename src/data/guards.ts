/**
 * HTEIM School of Ministry — Production Data Isolation & Demo Protection Guards
 *
 * Enforces strict boundaries between demo/simulation assets and production records:
 * 1. Demo records are never inserted into production automatically
 * 2. Demo users cannot authenticate as real users
 * 3. Demo attendance cannot overwrite real attendance
 * 4. Demo payments cannot appear in financial reports
 * 5. Demo assignments cannot appear to students
 */

import { CurriculumRecord } from './curriculum';

// Known demo account identifiers and patterns
export const DEMO_EMAIL_PATTERNS = [
  '@demo.',
  'demo@',
  'test@',
  '@example.com',
  '@example.test',
  '.example.test',
  '.test',
  'guest@hteim.edu',
  'demo@demo.hteim.edu',
  'teacher@demo.hteim.edu',
  'admin@demo.hteim.edu',
  'student@demo.hteim.edu'
];

export const DEMO_ASSIGNMENT_IDS = [
  'ASG-Q100',
  'ASG-100',
  'ASG-101',
  'ASG-102',
  'ASG-103',
  'asg-1',
  'asg-2',
  'asg-demo',
  'demo-quiz'
];

/**
 * Returns true if an attendance record is marked as demo or generated from demo static sets.
 */
export function isDemoRecord(record: any): boolean {
  if (!record || typeof record !== 'object') return false;
  if (record.isDemo === true || record._isDemo === true) return true;
  if (record.source === 'demo' || record.source === 'simulation') return true;
  if (typeof record.id === 'string' && record.id.startsWith('demo-')) return true;
  if (typeof record.notes === 'string' && record.notes.toLowerCase().includes('[demo]')) return true;
  return false;
}

/**
 * Returns true if a user identity or email belongs to a demo/simulation persona.
 */
export function isDemoUser(userOrEmail: any): boolean {
  if (!userOrEmail) return false;
  if (typeof userOrEmail === 'object') {
    if (userOrEmail.isDemoUser === true || userOrEmail.isDemo === true) return true;
    if (typeof userOrEmail.id === 'string' && (userOrEmail.id.startsWith('demo-') || userOrEmail.id.startsWith('dev-'))) return true;
    const email = userOrEmail.email || '';
    return isDemoUser(email);
  }

  if (typeof userOrEmail === 'string') {
    const clean = userOrEmail.toLowerCase().trim();
    if (clean.endsWith('@demo.hteim.edu')) return true;
    return DEMO_EMAIL_PATTERNS.some(pattern => clean.includes(pattern));
  }

  return false;
}

/**
 * Returns true if a payment, transaction, or invoice is a demo/simulation item.
 */
export function isDemoPayment(paymentOrInvoice: any): boolean {
  if (!paymentOrInvoice || typeof paymentOrInvoice !== 'object') return false;
  if (paymentOrInvoice.isDemo === true || paymentOrInvoice._isDemo === true) return true;
  if (paymentOrInvoice.source === 'demo' || paymentOrInvoice.source === 'mock') return true;
  if (typeof paymentOrInvoice.id === 'string' && paymentOrInvoice.id.toLowerCase().startsWith('demo-')) return true;
  if (typeof paymentOrInvoice.studentName === 'string' && paymentOrInvoice.studentName.toLowerCase().includes('demo')) return true;
  if (typeof paymentOrInvoice.studentId === 'string' && (paymentOrInvoice.studentId.toLowerCase().startsWith('demo-') || paymentOrInvoice.studentId.toLowerCase().startsWith('hteim-demo-'))) return true;
  if (typeof paymentOrInvoice.email === 'string' && isDemoUser(paymentOrInvoice.email)) return true;
  return false;
}

/**
 * Returns true if an assignment or quiz is designated as demo/sample coursework.
 */
export function isDemoAssignment(assignment: any): boolean {
  if (!assignment || typeof assignment !== 'object') return false;
  if (assignment.isDemo === true || assignment._isDemo === true) return true;
  if (assignment.category === 'demo' || assignment.source === 'demo') return true;
  if (typeof assignment.id === 'string') {
    if (assignment.id.toLowerCase().startsWith('demo-')) return true;
    if (DEMO_ASSIGNMENT_IDS.includes(assignment.id)) return true;
  }
  if (typeof assignment.title === 'string' && assignment.title.toLowerCase().startsWith('[demo]')) return true;
  return false;
}

/**
 * Sanitizes an application state payload before persisting to production databases.
 * Guarantees that no demo records, demo users, demo payments, or demo assignments leak into production.
 */
export function sanitizeProductionState<T extends Record<string, any>>(state: T): T {
  if (!state || typeof state !== 'object') return state;

  const sanitized: any = { ...state };

  // 1. Sanitize attendance records
  if (Array.isArray(sanitized.records)) {
    sanitized.records = sanitized.records.filter((r: any) => !isDemoRecord(r));
  }

  // 2. Sanitize user credentials
  if (Array.isArray(sanitized.userCredentials)) {
    sanitized.userCredentials = sanitized.userCredentials.filter((u: any) => !isDemoUser(u));
  }

  // 3. Sanitize payments, invoices, transactions
  if (Array.isArray(sanitized.payments)) {
    sanitized.payments = sanitized.payments.filter((p: any) => !isDemoPayment(p));
  }
  if (Array.isArray(sanitized.invoices)) {
    sanitized.invoices = sanitized.invoices.filter((i: any) => !isDemoPayment(i));
  }
  if (Array.isArray(sanitized.transactions)) {
    sanitized.transactions = sanitized.transactions.filter((t: any) => !isDemoPayment(t));
  }
  if (Array.isArray(sanitized.receipts)) {
    sanitized.receipts = sanitized.receipts.filter((r: any) => !isDemoPayment(r));
  }

  // 4. Sanitize custom assignments
  if (Array.isArray(sanitized.customAssignments)) {
    sanitized.customAssignments = sanitized.customAssignments.filter((a: any) => !isDemoAssignment(a));
  }

  // If the state was in demo mode, do not keep the demo flag in production
  if (sanitized.dataSource === 'demo') {
    sanitized.dataSource = 'production';
  }
  delete sanitized.isDemo;

  return sanitized as T;
}
