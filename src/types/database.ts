/**
 * ============================================================================
 * SCALABLE ACADEMIC DATA MODEL TYPES
 * HTEIM School of Ministry
 * ============================================================================
 * Standardized database definitions for PostgreSQL / Supabase entities,
 * relationships, and dynamic computed views.
 */

import { UserRole } from './rbac';

// Student Enrollment Status Enums
export type EnrollmentStatus = 
  | 'applied' 
  | 'active' 
  | 'at_risk' 
  | 'on_leave' 
  | 'graduated' 
  | 'withdrawn';

// Cohort Level Enums
export type CohortLevel = 
  | 'Level 1 Foundation' 
  | 'Level 2 Diploma' 
  | 'Level 3 Degree' 
  | 'Level 4 Executive';

// Status Enums
export type AcademicYearStatus = 'draft' | 'upcoming' | 'active' | 'completed' | 'archived';
export type TermStatus = 'upcoming' | 'active' | 'completed' | 'archived';
export type SubmissionStatus = 'draft' | 'submitted' | 'graded' | 'resubmitted' | 'late';
export type ProgramEnrollmentStatus = 'enrolled' | 'active' | 'completed' | 'withdrawn' | 'deferred';
export type CourseEnrollmentStatus = 'enrolled' | 'in_progress' | 'completed' | 'failed' | 'dropped';
// Attendance Status Enum (Strict values, arbitrary strings prohibited)
export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}
export type AttendanceStatusType = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'stripe' | 'card' | 'bank_transfer' | 'cash' | 'check' | 'scholarship' | 'other';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type DocumentType = 'photo_id' | 'statement_of_faith' | 'transcript' | 'pastoral_reference' | 'diploma' | 'other';
export type DocumentVerificationStatus = 'pending' | 'verified' | 'rejected' | 'expired';
export type NotificationCategory = 'academic' | 'attendance' | 'financial' | 'system' | 'ministry';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type MinistryRequirementType = 'practicum' | 'outreach' | 'mentorship' | 'service_hours' | 'character_reference';
export type MinistryRequirementStatus = 'pending' | 'in_progress' | 'completed' | 'waived';
export type AuditAction = 'create' | 'update' | 'delete' | 'soft_delete' | 'restore' | 'grade_override' | 'attendance_override';

// ============================================================================
// 1. USER & PROFILE ENTITIES
// ============================================================================

export interface DbUser {
  id: string; // UUID PK
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface DbProfile {
  id: string; // UUID PK
  user_id: string; // FK -> DbUser.id
  first_name: string;
  last_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  address?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface DbStudent {
  id: string; // UUID PK
  user_id: string; // FK -> DbUser.id
  student_number: string;
  enrollment_status: EnrollmentStatus;
  cohort_level: CohortLevel;
  admission_date: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// ============================================================================
// 2. ACADEMIC CURRICULUM HIERARCHY
// ============================================================================

export interface DbAcademicYear {
  id: string; // UUID PK
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  status: AcademicYearStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface DbTerm {
  id: string; // UUID PK
  academic_year_id: string; // FK -> DbAcademicYear.id
  code: string;
  name: string;
  sequence_order: number;
  start_date: string;
  end_date: string;
  status: TermStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface DbCourse {
  id: string; // UUID PK
  term_id: string; // FK -> DbTerm.id
  code: string;
  title: string;
  description?: string | null;
  credits: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface DbModule {
  id: string; // UUID PK
  course_id: string; // FK -> DbCourse.id
  code: string;
  title: string;
  sequence_order: number;
  description?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface DbLesson {
  id: string; // UUID PK
  module_id: string; // FK -> DbModule.id
  title: string;
  sequence_order: number;
  content?: string | null;
  video_url?: string | null;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface DbAssignment {
  id: string; // UUID PK
  lesson_id: string; // FK -> DbLesson.id
  title: string;
  description?: string | null;
  max_points: number;
  weight: number;
  due_at: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface DbSubmission {
  id: string; // UUID PK
  assignment_id: string; // FK -> DbAssignment.id
  student_id: string; // FK -> DbStudent.id
  status: SubmissionStatus;
  submitted_at: string;
  submission_content?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface DbGrade {
  id: string; // UUID PK
  submission_id: string; // FK -> DbSubmission.id UNIQUE
  graded_by_user_id?: string | null; // FK -> DbUser.id
  points_awarded: number;
  feedback?: string | null;
  graded_at: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// ============================================================================
// 3. ENROLLMENTS & RELATIONSHIPS
// ============================================================================

export interface DbEnrollment {
  id: string; // UUID PK
  student_id: string; // FK -> DbStudent.id
  academic_year_id: string; // FK -> DbAcademicYear.id
  term_id: string; // FK -> DbTerm.id
  status: ProgramEnrollmentStatus;
  enrolled_at: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface DbCourseEnrollment {
  id: string; // UUID PK
  enrollment_id: string; // FK -> DbEnrollment.id
  student_id: string; // FK -> DbStudent.id
  course_id: string; // FK -> DbCourse.id
  status: CourseEnrollmentStatus;
  enrolled_at: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// ============================================================================
// 4. OPERATIONAL RELATIONSHIPS (ATTENDANCE HIERARCHY: session -> record -> student_id)
// ============================================================================

/**
 * Attendance Session Entity (attendance_session)
 * Represents an authoritative class meeting/session day.
 */
export interface DbAttendanceSession {
  id: string; // UUID PK
  course_id?: string | null; // FK -> DbCourse.id
  cohort_id?: string | null;
  session_date: string; // YYYY-MM-DD
  title?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

/**
 * Attendance Record Entity (attendance_record)
 * Links directly to attendance_session and student_id with strict enum status.
 */
export interface DbAttendanceRecord {
  id: string; // UUID PK
  session_id: string; // FK -> DbAttendanceSession.id
  student_id: string; // FK -> DbStudent.id
  status: AttendanceStatus | AttendanceStatusType;
  notes?: string | null;
  manual_override?: boolean;
  locked?: boolean;
  recorded_by_user_id?: string | null; // FK -> DbUser.id
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Legacy attendance table representation for backwards compatibility
export interface DbAttendance {
  id: string; // UUID PK
  student_id: string; // FK -> DbStudent.id
  course_id: string; // FK -> DbCourse.id
  lesson_id?: string | null; // FK -> DbLesson.id
  session_date: string;
  status: AttendanceStatus | AttendanceStatusType | string;
  notes?: string | null;
  recorded_by_user_id?: string | null; // FK -> DbUser.id
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface DbInvoice {
  id: string; // UUID PK
  student_id: string; // FK -> DbStudent.id
  invoice_number: string;
  academic_year_id?: string | null; // FK -> DbAcademicYear.id
  term_id?: string | null; // FK -> DbTerm.id
  amount_due: number;
  due_date: string;
  status: InvoiceStatus;
  issued_at: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface DbPayment {
  id: string; // UUID PK
  invoice_id?: string | null; // FK -> DbInvoice.id
  student_id: string; // FK -> DbStudent.id
  payment_number: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference_number?: string | null;
  status: PaymentStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface DbDocument {
  id: string; // UUID PK
  student_id: string; // FK -> DbStudent.id
  document_type: DocumentType;
  title: string;
  file_url: string;
  verification_status: DocumentVerificationStatus;
  verified_by_user_id?: string | null; // FK -> DbUser.id
  verified_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface DbNotification {
  id: string; // UUID PK
  user_id: string; // FK -> DbUser.id
  student_id?: string | null; // FK -> DbStudent.id
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  deleted_at?: string | null;
}

export interface DbMinistryRequirement {
  id: string; // UUID PK
  student_id: string; // FK -> DbStudent.id
  title: string;
  requirement_type: MinistryRequirementType;
  required_hours: number;
  completed_hours: number;
  status: MinistryRequirementStatus;
  supervisor_name?: string | null;
  supervisor_approval: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface DbAuditHistory {
  id: string; // UUID PK
  actor_user_id?: string | null; // FK -> DbUser.id
  entity_type: string;
  entity_id: string;
  action: AuditAction;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  timestamp: string;
}

// ============================================================================
// 5. AUTHORITATIVE COMPUTED VIEWS (Calculated dynamically, not stored)
// ============================================================================

export interface VStudentAttendanceSummary {
  student_id: string;
  student_number: string;
  student_name: string;
  total_sessions_logged: number;
  present_count: number;
  tardy_count: number;
  excused_count: number;
  absent_count: number;
  attendance_percentage: number; // Calculated: (present + tardy + excused) / total * 100
  is_at_risk: boolean; // Calculated: attendance_percentage < 75.00
}

export interface VStudentFinancialSummary {
  student_id: string;
  student_number: string;
  student_name: string;
  total_invoiced: number; // Calculated: SUM(invoices.amount_due)
  total_paid: number; // Calculated: SUM(payments.amount)
  outstanding_balance: number; // Calculated: total_invoiced - total_paid
  has_overdue_balance: boolean; // Calculated: outstanding_balance > 0
}

export interface VStudentAcademicSummary {
  student_id: string;
  student_number: string;
  student_name: string;
  total_submissions: number;
  graded_submissions: number;
  average_grade_percentage: number; // Calculated: AVG(points_awarded / max_points * 100)
}

/**
 * Validates whether a given status value is an allowed AttendanceStatus enum.
 * Prohibits arbitrary strings.
 */
export function isValidAttendanceStatus(status: unknown): status is AttendanceStatus {
  if (typeof status !== 'string') return false;
  const upper = status.trim().toUpperCase();
  return upper === 'PRESENT' || upper === 'ABSENT' || upper === 'LATE' || upper === 'EXCUSED';
}

/**
 * Normalizes input status to the strict AttendanceStatus enum (PRESENT, ABSENT, LATE, EXCUSED).
 * Rejects arbitrary strings with a clear validation error.
 */
export function parseAttendanceStatus(status: unknown): AttendanceStatus {
  if (typeof status !== 'string' || !status.trim()) {
    throw new Error('Attendance status is required. Allowed values are strictly: PRESENT, ABSENT, LATE, EXCUSED');
  }
  const upper = status.trim().toUpperCase();
  if (upper === 'PRESENT' || upper === 'P' || upper === 'ATTENDED') {
    return AttendanceStatus.PRESENT;
  }
  if (upper === 'ABSENT' || upper === 'A') {
    return AttendanceStatus.ABSENT;
  }
  if (upper === 'LATE' || upper === 'TARDY' || upper === 'L' || upper === 'T') {
    return AttendanceStatus.LATE;
  }
  if (upper === 'EXCUSED' || upper === 'E') {
    return AttendanceStatus.EXCUSED;
  }
  throw new Error(`Invalid attendance status "${status}". Arbitrary status strings are forbidden. Allowed values: PRESENT, ABSENT, LATE, EXCUSED`);
}

