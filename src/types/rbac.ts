/**
 * Role-Based Access Control (RBAC) Data Contracts & Permissions
 * HTEIM School of Ministry
 */

export type UserRole =
  | 'super_admin'     // Everything
  | 'admin'           // Students, enrollment, attendance, payments, reports
  | 'registrar'       // Enrollment, student records, academic documents
  | 'lecturer'        // Assigned courses, attendance, assignments, grades
  | 'student'         // Own courses, attendance, grades, assignments, payments
  | 'finance_officer' // Payments, balances, receipts, financial reports
  | 'librarian'       // Library resources and borrowing
  | 'viewer'          // Read-only access to selected information
  // Legacy aliases for backward compatibility:
  | 'teacher'
  | 'staff';

export interface RoleDefinition {
  id: UserRole;
  title: string;
  badge: string;
  color: string;
  badgeBg: string;
  description: string;
  accessibleTabs: string[];
  permissions: Permission[];
}

export type Permission =
  | 'all:access'
  // Students
  | 'students:read'
  | 'students:write'
  // Attendance
  | 'attendance:read'
  | 'attendance:write'
  | 'attendance:approve'
  // Assignments
  | 'assignments:read'
  | 'assignments:submit'
  | 'assignments:grade'
  // Grades
  | 'grades:read'
  | 'grades:write'
  | 'grades:release'
  // Finance
  | 'finance:read'
  | 'finance:write'
  | 'finance:refund'
  // Audit
  | 'audit:read'
  // Governance
  | 'users:manage'
  | 'roles:manage';

export interface AuthenticatedUser {
  uid: string;           // Firebase UID
  userId: string;        // Database users table UUID (id)
  id: string;            // Aliased to userId for backward compatibility
  email: string;
  name: string;
  role: UserRole;
  studentRecordId?: string; // Database students table UUID (students.id)
  studentNumber?: string;   // Administrative registration code (students.student_number)
  studentName?: string;
  assignedCourses?: string[];
  permissions: Permission[];
  /** @deprecated Use explicit studentRecordId (UUID) or studentNumber (registration code) instead. Strictly aliases studentRecordId (UUID). */
  studentId?: string;
}

export const ROLE_DEFINITIONS: Record<string, RoleDefinition> = {
  super_admin: {
    id: 'super_admin',
    title: 'Super Admin',
    badge: 'Super Admin',
    color: 'text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    badgeBg: 'bg-purple-100 dark:bg-purple-950/60',
    description: 'Unrestricted master access to all system entities, database settings, audit logs, and security roles.',
    accessibleTabs: ['home', 'attendance', 'students', 'courses', 'exams', 'schedule', 'library', 'payments', 'messages', 'reports', 'notes'],
    permissions: [
      'all:access',
      'students:read',
      'students:write',
      'attendance:read',
      'attendance:write',
      'attendance:approve',
      'assignments:read',
      'assignments:submit',
      'assignments:grade',
      'grades:read',
      'grades:write',
      'grades:release',
      'finance:read',
      'finance:write',
      'finance:refund',
      'audit:read',
      'users:manage',
      'roles:manage'
    ]
  },
  admin: {
    id: 'admin',
    title: 'Administrator',
    badge: 'Administrator',
    color: 'text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
    description: 'Full administrative control over students, attendance approvals, curriculum grades, tuition, audits, and users.',
    accessibleTabs: ['home', 'attendance', 'students', 'courses', 'exams', 'schedule', 'library', 'payments', 'messages', 'reports', 'notes'],
    permissions: [
      'students:read',
      'students:write',
      'attendance:read',
      'attendance:write',
      'attendance:approve',
      'assignments:read',
      'assignments:submit',
      'assignments:grade',
      'grades:read',
      'grades:write',
      'grades:release',
      'finance:read',
      'finance:write',
      'finance:refund',
      'audit:read',
      'users:manage',
      'roles:manage'
    ]
  },
  registrar: {
    id: 'registrar',
    title: 'Registrar',
    badge: 'Registrar',
    color: 'text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/60',
    description: 'Admissions, student enrollment, academic records, official grade releases, and student registry management.',
    accessibleTabs: ['home', 'students', 'courses', 'schedule', 'reports', 'notes'],
    permissions: [
      'students:read',
      'students:write',
      'attendance:read',
      'assignments:read',
      'grades:read',
      'grades:release',
      'audit:read'
    ]
  },
  lecturer: {
    id: 'lecturer',
    title: 'Lecturer / Faculty',
    badge: 'Lecturer',
    color: 'text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    description: 'Course teachings, class session attendance marking, homework grading, and score assignments.',
    accessibleTabs: ['home', 'attendance', 'courses', 'exams', 'schedule', 'library', 'notes'],
    permissions: [
      'students:read',
      'attendance:read',
      'attendance:write',
      'assignments:read',
      'assignments:grade',
      'grades:read',
      'grades:write'
    ]
  },
  student: {
    id: 'student',
    title: 'Student',
    badge: 'Student',
    color: 'text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    description: 'Self-service access for personal attendance, assignment submissions, course grades, and tuition ledger.',
    accessibleTabs: ['home', 'attendance', 'courses', 'exams', 'schedule', 'library', 'payments', 'notes'],
    permissions: [
      'students:read',
      'attendance:read',
      'assignments:read',
      'assignments:submit',
      'grades:read',
      'finance:read'
    ]
  },
  finance_officer: {
    id: 'finance_officer',
    title: 'Finance Officer',
    badge: 'Finance Officer',
    color: 'text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800',
    badgeBg: 'bg-teal-100 dark:bg-teal-950/60',
    description: 'Tuition invoicing, payment transaction recording, refunds, financial adjustments, and ledger auditing.',
    accessibleTabs: ['home', 'payments', 'reports', 'students', 'notes'],
    permissions: [
      'students:read',
      'finance:read',
      'finance:write',
      'finance:refund',
      'audit:read'
    ]
  },
  librarian: {
    id: 'librarian',
    title: 'Librarian',
    badge: 'Librarian',
    color: 'text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-950/60',
    description: 'Curriculum library resources, digital PDF syllabi, pastoral handouts, and academic reading catalogs.',
    accessibleTabs: ['home', 'library', 'schedule', 'courses', 'notes'],
    permissions: [
      'students:read',
      'assignments:read'
    ]
  },
  viewer: {
    id: 'viewer',
    title: 'Viewer (Read-Only)',
    badge: 'Viewer',
    color: 'text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    description: 'Read-only access to general catalogs, courses, and ministry announcements.',
    accessibleTabs: ['home', 'courses', 'schedule', 'library'],
    permissions: [
      'students:read',
      'attendance:read',
      'assignments:read',
      'grades:read',
      'finance:read'
    ]
  },
  // Legacy aliases
  teacher: {
    id: 'lecturer',
    title: 'Lecturer / Faculty',
    badge: 'Lecturer',
    color: 'text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    description: 'Course teachings, class session attendance marking, homework grading, and score assignments.',
    accessibleTabs: ['home', 'attendance', 'courses', 'exams', 'schedule', 'library', 'notes'],
    permissions: [
      'students:read',
      'attendance:read',
      'attendance:write',
      'assignments:read',
      'assignments:grade',
      'grades:read',
      'grades:write'
    ]
  },
  staff: {
    id: 'admin',
    title: 'Administrator',
    badge: 'Administrator',
    color: 'text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
    description: 'Administrative support for students, attendance, grades, and finance.',
    accessibleTabs: ['home', 'attendance', 'students', 'courses', 'exams', 'schedule', 'library', 'payments', 'messages', 'reports', 'notes'],
    permissions: [
      'students:read',
      'students:write',
      'attendance:read',
      'attendance:write',
      'assignments:read',
      'grades:read',
      'finance:read',
      'finance:write',
      'audit:read'
    ]
  }
};

/**
 * Normalizes legacy role string into canonical UserRole
 */
export function normalizeUserRole(role: string | undefined | null): UserRole {
  if (!role) return 'student';
  const clean = role.toLowerCase().trim();
  if (clean === 'super_admin' || clean === 'superadmin') return 'super_admin';
  if (clean === 'admin' || clean === 'administrator' || clean === 'staff') return 'admin';
  if (clean === 'registrar') return 'registrar';
  if (clean === 'lecturer' || clean === 'teacher' || clean === 'faculty') return 'lecturer';
  if (clean === 'student') return 'student';
  if (clean === 'finance_officer' || clean === 'finance' || clean === 'accountant') return 'finance_officer';
  if (clean === 'librarian') return 'librarian';
  if (clean === 'viewer' || clean === 'guest' || clean === 'readonly') return 'viewer';
  return 'student';
}

/**
 * Checks if a given role has a specific permission
 */
export function roleHasPermission(role: UserRole | string, permission: Permission): boolean {
  const normRole = normalizeUserRole(role);
  if (normRole === 'super_admin') return true;
  const def = ROLE_DEFINITIONS[normRole];
  if (!def) return false;
  if (def.permissions.includes('all:access')) return true;
  return def.permissions.includes(permission);
}
