export type TabType = 'home' | 'attendance' | 'students' | 'courses' | 'exams' | 'schedule' | 'library' | 'payments' | 'messages' | 'reports' | 'notes' | 'classroom';

import { UserRole } from './types/rbac';
export * from './types/rbac';
import { 
  QuizAttempt, 
  QuizResponse, 
  QuizSubmission,
  QuizSubmissionResponse,
  AttemptStatus as QuizAttemptStatus, 
  GradingStatus as QuizGradingStatus 
} from './features/assessments/quizzes/types/quiz.types';

export type { 
  QuizAttempt, 
  QuizResponse, 
  QuizSubmission,
  QuizSubmissionResponse,
  QuizAttemptStatus, 
  QuizGradingStatus 
};

import type {
  ResourceType,
  ResourceSource,
  ResourceStatus,
  ResourceViewerType,
  LearningResource,
  AcademicCourseNode,
  AcademicModuleNode,
  AcademicLessonNode,
  LessonResourceBundle,
  CurriculumHierarchy
} from './features/library/types';

export type {
  ResourceType,
  ResourceSource,
  ResourceStatus,
  ResourceViewerType,
  LearningResource,
  AcademicCourseNode,
  AcademicModuleNode,
  AcademicLessonNode,
  LessonResourceBundle,
  CurriculumHierarchy
};
import { AttendanceStatus, AttendanceStatusType } from './types/database';
export * from './types/database';
export type { StudentClassNote } from './utils/notesStorage';

export interface FacultyTeacher {
  id: string;
  name: string;
  title: string;
  role: string;
  bio: string;
  module: string;
  image: string;
  badgeColor: string;
}

export interface GraduationPhoto {
  id: string;
  title: string;
  caption: string;
  cohortYear: string;
  date?: string;
  imageUrl: string;
  category: 'commencement' | 'diploma' | 'prayer' | 'celebration' | 'fellowship';
  featuredQuote?: string;
  scripture?: string;
  studentHonors?: string[];
  imageFit?: 'contain' | 'cover' | 'top';
}

export type AcademicLevel = {
  id: string;
  code: string;
  name: string;
  badge: string;
  sub: string;
  color: string;
  badgeBg: string;
};

export const ACADEMIC_LEVELS: AcademicLevel[] = [
  { 
    id: 'level_1', 
    code: 'Level 1', 
    name: 'Level 1: Foundation Certificate', 
    badge: 'L1: Foundation', 
    sub: 'Modules 1 & 2 (Intro & Evangelism)', 
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  { 
    id: 'level_2', 
    code: 'Level 2', 
    name: 'Level 2: Intermediate Diploma', 
    badge: 'L2: Diploma', 
    sub: 'Modules 3 & 4 (Ethics & Apostolic)', 
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  { 
    id: 'level_3', 
    code: 'Level 3', 
    name: 'Level 3: Advanced Degree & License', 
    badge: 'L3: Degree', 
    sub: 'Modules 5 & 6 (Prophetic & Pastors)', 
    color: 'bg-amber-100 text-amber-900 border-amber-300',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200'
  },
  { 
    id: 'level_4', 
    code: 'Level 4', 
    name: 'Level 4: Executive Leadership & Faculty', 
    badge: 'L4: Executive', 
    sub: 'Postgraduate Leadership Cohort', 
    color: 'bg-purple-100 text-purple-900 border-purple-300',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200'
  },
];

export const getDefaultLevelForStudent = (studentName: string, index: number = 0): string => {
  const code = Math.abs(studentName.split('').reduce((acc, char) => acc + char.charCodeAt(0), index)) % 4;
  if (code === 0) return 'level_1';
  if (code === 1) return 'level_2';
  if (code === 2) return 'level_3';
  return 'level_4';
};

export type PaymentRecord = {
  id: string;
  studentId: string; // Foreign Key / UUID
  studentName?: string;
  student?: {
    id: string;
    name: string;
    email?: string;
  };
  cohortId?: string;
  email?: string;
  phone?: string;
  moduleTrack: string;
  totalTuition: number;
  amountPaid: number;
  status: 'Paid In Full' | 'Partial' | 'Past Due' | 'Pending Review';
  lastPaymentDate: string;
  paymentMethod: 'Credit Card' | 'Bank Transfer' | 'Zelle' | 'Check' | 'Scholarship' | 'Cash' | 'PayPal' | 'Stripe';
  notes?: string;
  receiptUrl?: string;
  receiptName?: string;
  receiptNumber?: string;
  paymentPlan?: PaymentPlanType;
  isDemo?: boolean;
};

export type InvoiceLineType = 
  | 'tuition' 
  | 'mandatory_fee' 
  | 'registration' 
  | 'course_material' 
  | 'applicable_charge' 
  | 'technology_fee' 
  | 'other';

export type InvoiceLine = {
  id?: string;
  invoiceId?: string;
  lineType: InvoiceLineType;
  description: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number; // Server-computed: quantity * unitAmount
  createdAt?: string;
};

export type PaymentAllocation = {
  id?: string;
  paymentId: string;
  invoiceId: string;
  allocatedAmount: number;
  notes?: string;
  createdAt?: string;
};

export type RefundAllocation = {
  id?: string;
  refundId: string;
  invoiceId: string;
  paymentAllocationId?: string;
  allocatedAmount: number;
  createdAt?: string;
};

export type RefundRecord = {
  id: string; // UUID internal ID
  refundNumber: string; // Sequence: REF-2026-000001
  paymentId?: string; // Links to internal payment UUID
  studentId: string;
  studentName?: string;
  amount: number;
  reason: string;
  status: 'approved' | 'pending' | 'processed' | 'void' | 'rejected';
  refundDate: string;
  approvedBy?: string;
  notes?: string;
  allocations?: RefundAllocation[];
  createdAt?: string;
};

export type FinancialAdjustmentType = 
  | 'discount' 
  | 'scholarship' 
  | 'refund' 
  | 'adjustment' 
  | 'fee_waiver' 
  | 'late_fee'
  | 'applicable_charge';

export type FinancialAdjustment = {
  id: string; // UUID internal ID
  adjustmentNumber?: string; // Sequence: ADJ-2026-000001
  invoiceId: string; // Links to invoice UUID
  studentId: string; // Foreign Key / UUID
  studentName?: string;
  student?: {
    id: string;
    name: string;
  };
  type: FinancialAdjustmentType;
  isCharge?: boolean; // false = credit (scholarship, discount, fee waiver), true = charge (applicable charge, late fee)
  categoryName: string; // e.g. "Five-Fold Ministry Scholarship", "Early Bird Discount", "Course Drop Refund"
  amount: number; // strictly positive magnitude
  status?: 'approved' | 'pending' | 'rejected' | 'void'; // Only approved adjustments affect balance!
  appliedDate: string;
  authorizedBy: string;
  notes?: string;
  receiptOrDocRef?: string;
  createdAt?: string;
};

export type Invoice = {
  id: string; // UUID internal ID
  invoiceNumber?: string; // Sequence: INV-2026-000001
  studentId: string; // Foreign Key / UUID PK
  studentName?: string;
  student?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  email?: string;
  phone?: string;
  moduleTrack: string;
  term?: string; // e.g. "2026 Semester 1"
  academicYear?: string;
  issueDate: string;
  dueDate: string;
  lines?: InvoiceLine[];
  allocations?: PaymentAllocation[];
  refundAllocations?: RefundAllocation[];
  adjustmentsList?: FinancialAdjustment[];
  totalTuition: number; // Server calculated from invoice_lines
  discounts: number; // Server calculated from approved discounts
  scholarships: number; // Server calculated from approved scholarships
  refunds?: number; // Server calculated from approved refund allocations
  adjustments?: number; // Server calculated from approved applicable charges
  applicableCharges?: number; // Server calculated from approved charges
  netTuition: number; // Server calculated: (totalTuition + applicableCharges) - approved discounts/scholarships
  amountPaid: number; // Server calculated: sum of completed payment allocations - refunds
  outstandingBalance: number; // Server calculated: invoice total - payments - approved adjustments + applicable charges
  paymentPlan: 'Pay In Full' | 'Monthly Installments' | 'Custom Plan' | string;
  status: 'Paid' | 'Partially Paid' | 'Unpaid' | 'Past Due' | 'Refunded' | 'Cancelled';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PaymentTransaction = {
  id: string; // UUID internal ID
  paymentNumber?: string; // Sequence: PAY-2026-000001
  invoiceId: string; // Links to invoice UUID
  studentId: string; // Foreign Key / UUID
  studentName?: string;
  student?: {
    id: string;
    name: string;
  };
  amount: number;
  paymentDate: string;
  paymentMethod: 'Credit Card' | 'Bank Transfer' | 'Zelle' | 'Check' | 'Scholarship' | 'Cash' | 'PayPal' | 'Stripe' | string;
  paymentReference?: string; // wire confirmation, check #, transaction reference
  receiptNumber: string; // Sequence: RCP-2026-000001
  status: 'Completed' | 'Pending' | 'Failed' | 'Refunded';
  allocations?: PaymentAllocation[];
  notes?: string;
  recordedBy?: string;
  reconciliationStatus?: 'Reconciled' | 'Unreconciled' | 'Discrepancy';
  reconciledAt?: string;
  reconciledBy?: string;
  depositBatchId?: string;
  createdAt?: string;
};

export type Receipt = {
  id: string; // UUID internal ID
  receiptNumber: string; // Sequence: RCP-2026-000001
  paymentId: string; // Links to internal payment UUID
  invoiceId: string; // Links to internal invoice UUID
  studentId: string; // Foreign Key / UUID
  studentName?: string;
  student?: {
    id: string;
    name: string;
  };
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  paymentReference?: string;
  issuedAt: string;
  issuedBy?: string;
  academicTerm?: string;
  courseOrModule?: string;
  totalTuitionBilled?: number;
  discountsAndScholarships?: number;
  balanceRemaining?: number;
  verificationCode?: string;
  notes?: string;
};

import { AuditLogEntry, AuditLogCategory, AuditActionCode } from './lib/auditLogger';
export type { AuditLogEntry, AuditLogCategory, AuditActionCode };
export { logActivity, logAuditEvent, getAuditLogs } from './lib/auditLogger';

export type FinancialAuditLog = {
  id: string;
  timestamp: string;
  action: 'INVOICE_CREATED' | 'PAYMENT_RECORDED' | 'ADJUSTMENT_APPLIED' | 'REFUND_ISSUED' | 'PAYMENT_RECONCILED' | 'INVOICE_UPDATED' | 'SCHOLARSHIP_AWARDED' | 'CHARGE_APPLIED';
  actorName: string;
  actorRole: string;
  studentId: string;
  studentName: string;
  entityId: string;
  entityType: 'invoice' | 'transaction' | 'receipt' | 'adjustment' | 'refund';
  amount?: number;
  details: string;
  metadata?: Record<string, any>;
};

export type StudentProfile = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  enrolledModule: string;
  enrolmentDate: string;
  status: 'active' | 'probation' | 'graduated' | 'inactive';
};

export type MediaResource = {
  id: string;
  title: string;
  speaker: string;
  duration: string;
  type: 'audio' | 'video';
  url: string;
  description?: string;
  dateAdded?: string;
  chapters?: { time: number; title: string }[];
};

export type Course = {
  id: string;
  code: string;
  title: string;
  instructor: string;
  credits: number;
  description: string;
  scheduleDays: string;
  location: string;
  topics: string[];
  enrolledCount: number;
  mediaResources?: MediaResource[];
  expiryDate?: string; // YYYY-MM-DD
  cohortId?: string;
};

export type QuizQuestionType = 
  | 'multiple_choice' 
  | 'checkboxes' 
  | 'true_false' 
  | 'short_answer' 
  | 'paragraph'
  | 'fill_blank';

export type QuizRubricCriteria = {
  name: string;
  weightPercentage: number; // e.g. 30 (for 30%), 25, 20, 15, 10
  maxScore: number; // e.g. 20, 30, etc.
};

export type QuizRubric = {
  id: string;
  name: string;
  criteria: QuizRubricCriteria[];
};

export type QuizQuestionOption = {
  id: string;
  text: string;
};

export type QuizQuestion = {
  id: string;
  questionText: string;
  type?: QuizQuestionType;
  options: QuizQuestionOption[];
  correctOptionId?: string; // for multiple_choice, true_false
  correctOptionIds?: string[]; // for checkboxes (multi-select)
  acceptableAnswers?: string[]; // for short_answer / fill_blank
  weight: number; // points for this question (e.g. 5, 10, 20)
  explanation?: string;
  feedbackCorrect?: string; // Google Forms style feedback for correct answer
  feedbackIncorrect?: string; // Google Forms style feedback for incorrect answer
  required?: boolean;
  imageUrl?: string;
  sectionTitle?: string;
  gradingMode?: 'exact' | 'case_insensitive' | 'trim' | 'multiple' | 'manual';
  rubric?: QuizRubric;
};

export type QuizStatus =
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'in_progress'
  | 'closed'
  | 'graded'
  | 'archived';

export type QuizGradeCalculation = 'highest' | 'latest' | 'average' | 'first';

// Consolidated Quiz Types imported from ./features/assessments/quizzes/types/quiz.types

export interface QuizPoolConfig {
  id: string;
  poolName: string;
  courseCode?: string;
  moduleTrack?: string;
  topic?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  questionCountToPresent: number;
  randomize: boolean;
}

export type QuizSettings = {
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showCorrectAnswers?: boolean;
  showPointValues?: boolean;
  showFeedback?: boolean;
  passingScorePercentage?: number; // default 75%
  allowMultipleAttempts?: boolean;
  maxAttempts?: number; // 1, 2, 3, etc. or undefined for unlimited
  gradeReleasePolicy?: 'immediate' | 'manual';
  requireAllQuestionsAnswered?: boolean;
  collectStudentEmail?: boolean;
  gradeCalculation?: QuizGradeCalculation;
  audienceCohortId?: string; // e.g. "Class of 2026", "Class of 2027", "all"
  availableFromDate?: string; // YYYY-MM-DD
  availableFromTime?: string; // HH:MM
  closeDate?: string; // YYYY-MM-DD
  closeTime?: string; // HH:MM
  poolConfig?: QuizPoolConfig;
  randomizeFromPool?: boolean;
};

export type QuizAssignment = {
  id: string;
  title: string;
  courseCode?: string;
  moduleTrack?: string;
  description?: string;
  classDayId?: string;
  questions: QuizQuestion[];
  totalPoints: number; // sum of weights
  dueDate?: string;
  availableFrom?: string;
  availableUntil?: string;
  createdAt: string;
  updatedAt?: string;
  isPublished?: boolean;
  isTemplate?: boolean;
  status?: QuizStatus;
  shareCode: string; // e.g. "qz_9f8a2" for shareable links
  timeLimitMinutes?: number;
  quizData?: QuizAssignment;
  settings?: QuizSettings;
  category?: string;
  sectionHeaders?: { id: string; title: string; description?: string; afterQuestionIndex: number }[];
  version?: number; // starts at 1
  currentVersionId?: string;
  versionHistory?: { version: number; updatedAt: string; questions: QuizQuestion[]; changeLog?: string }[];
};

// QuizSubmissionResponse and QuizSubmission are deprecated in favor of QuizResponse and QuizAttempt

export type ExamItem = {
  id: string;
  title: string;
  courseCode: string;
  date: string;
  maxPoints: number;
  weight: string;
  description: string;
};

export type ScheduleItem = {
  id: string;
  classDayId?: string;
  cohortId?: string;
  title: string;
  courseCode: string;
  moduleName?: string;
  date: string; // YYYY-MM-DD
  timeSlot: string;
  instructor: string;
  room: string;
  status: 'upcoming' | 'completed' | 'live';
  period?: string; // e.g. "1st Period", "2nd Period", "3rd Period", "4th Period", "5th Period", "Evening"
  zoomUrl?: string;
  recordingUrl?: string;
  postClassMaterialsUrl?: string;
  meetingPasscode?: string;
};

export type ResourceVersion = {
  version: string;
  date: string;
  note: string;
  author?: string;
  downloadUrl?: string;
};

export type ResourceVisibility =
  | 'public'
  | 'authenticated'
  | 'students'
  | 'teachers'
  | 'course'
  | 'module'
  | 'restricted';

export type LibraryResource = {
  id: string;
  title: string;
  category: string;
  author: string;
  courseCode: string;
  format: string;
  size: string;
  summary: string;
  downloadUrl?: string;
  isBorrowable?: boolean;
  fullContent?: string;
  fileDataUrl?: string;
  fileName?: string;
  mimeType?: string;
  keyTakeaways?: string[];
  aiEvaluated?: boolean;
  uploadedAt?: string;
  downloadCount?: number;
  versionsHistory?: ResourceVersion[];
  version?: string;
  audience?: string;
  moduleTrack?: string;
  isRequiredReading?: boolean;
  weekNumber?: number;
  completedByStudents?: string[];
  scriptureReferences?: string[];
  status?: 'draft' | 'published' | 'archived';
  isPublished?: boolean;
  lessonId?: string;
  tags?: string[];
  thumbnailUrl?: string;
  accessLevel?: string;
  visibility?: ResourceVisibility;
  allowedRoles?: string[];
  allowedUserIds?: string[];
  allowedCourseIds?: string[];
  allowedModuleIds?: string[];
};

export type AssignmentGroup = {
  id: string;
  groupName: string;
  memberNames: string[];
};

export type CustomAssignment = {
  id: string;
  title: string;
  courseCode?: string;
  moduleTrack?: string;
  cohortId?: string;
  description: string;
  startDate?: string;
  dueDate: string;
  maxPoints: number;
  points?: number;
  createdAt: string;
  teacherAttachmentUrl?: string;
  teacherAttachmentName?: string;
  type?: 'document' | 'quiz';
  quizData?: QuizAssignment;
  isDemo?: boolean;
  isDraft?: boolean;
  published?: boolean;
  classDay?: string;
  isGroupAssignment?: boolean;
  groups?: AssignmentGroup[];
};

export type GradingWeights = {
  quizzes: number;
  assignments: number;
  attendance: number;
  scriptureRecitation: number;
};

export type GradeLifecycleStatus = 'SUBMITTED' | 'GRADED' | 'MODERATION' | 'RELEASED' | 'LOCKED' | 'submitted' | 'graded' | 'moderation' | 'released' | 'locked';

export type AssignmentSubmission = {
  id: string;
  assignmentId: string;
  studentId?: string; // Primary Foreign Key (UUID)
  studentName?: string; // Display Attribute
  student?: {
    id: string;
    name: string;
    email?: string;
  };
  submittedAt: string;
  
  // Student's response upload
  studentFileUrl?: string;
  studentFileName?: string;
  studentFileType?: string;
  studentFiles?: { name: string; url: string; type?: string }[];
  studentNotes?: string;
  studentTypedResponse?: string;
  
  // Quiz auto-graded responses
  quizAttemptId?: string;
  quizAttempt?: QuizAttempt;
  quizAnswers?: any;
  percentage?: number;
  timeSpentSeconds?: number;
  maxScore?: number;
  maxPoints?: number;

  // Teacher's correction, evaluation, and corrected document upload
  teacherCorrectedFileUrl?: string;
  teacherCorrectedFileName?: string;
  teacherCorrectedFileType?: string;
  teacherFeedback?: string;
  score?: number;
  status: GradeLifecycleStatus | 'Submitted' | 'Graded' | 'Correction Returned' | 'Pending Review';
  updatedAt: string;
  isGroupSubmission?: boolean;
  groupId?: string;
  groupName?: string;
  groupMembers?: string[];
};

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type?: string;
  eventType?: string;
  category?: string;
  targetRole?: 'admin' | 'teacher' | 'student' | 'all';
  studentId?: string;
  studentName?: string;
  assignmentId?: string;
  courseOfferingId?: string;
  createdAt: string;
  read: boolean;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  actionTab?: TabType;
  actionUrl?: string;
  channelSent?: ('portal' | 'in_app' | 'email' | 'sms' | 'push' | 'whatsapp')[];
  deliveryLogs?: any[];
  channelDelivery?: any;
  metadata?: Record<string, any>;
};

export interface AttendanceSession {
  id: string; // UUID PK
  sessionDate: string; // YYYY-MM-DD
  title?: string;
  name?: string;
  courseId?: string;
  cohortId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AttendanceRecord = {
  id?: string;
  sessionId?: string; // Foreign Key -> attendance_session.id
  studentId?: string; // Primary Foreign Key (UUID) -> student_id
  status?: AttendanceStatus | AttendanceStatusType | string; // PRESENT | ABSENT | LATE | EXCUSED
  notes?: string;
  manualOverride?: boolean;
  locked?: boolean;
  recordedBy?: string;
  createdAt?: string;
  updatedAt?: string;

  // Populated relations
  session?: AttendanceSession;
  student?: {
    id: string;
    name: string;
    email?: string;
    photoUrl?: string | null;
    studentNumber?: string;
  };

  // Backwards compatibility & convenience view fields
  name?: string; // Display Attribute
  studentName?: string; // Display Attribute
  timestamp?: string;
  sessionDate?: string;
  date?: string;
  capturedAt?: string;
  score?: string;
  classDay?: string;
  present?: boolean;
  cohortId?: string;
};

export type ClassDay = {
  id: string;
  name: string;
  cohortId?: string;
  academicYear?: number;
  date?: string;
  isLocked?: boolean;
};

export type StudentEnrollmentStatus = 'active' | 'dropped_out' | 'withdrawn' | 'graduated' | 'leave_of_absence';

export type StudentSummary = {
  id?: string; // Primary Key (UUID)
  name: string; // Display Attribute
  studentNumber?: string;
  totalDays: number;
  attendanceByDay: Record<string, { present: boolean; timestamp?: string; score?: string }>;
  rate: number;
  attended: number;
  avgScore: number | null;
  percentage?: number | null;
  scoreStr?: string;
  attendanceRate?: number;
  attendedSessions?: number;
  totalSessions?: number;
  note?: string;
  photoUrl?: string;
  levelId: string;
  email?: string;
  phone?: string;
  enrolledModule?: string;
  cohortId?: string;
  enrollmentStatus?: StudentEnrollmentStatus;
  isDroppedOut?: boolean;
  dropoutReason?: string;
  dropoutDate?: string;
};

export type StudentRecord = StudentSummary;

export type MessagePriority = 'normal' | 'important' | 'urgent';
export type MessageCategory = 'general' | 'assignment' | 'attendance' | 'tuition' | 'exam' | 'technical';

export type MessageAttachment = {
  name: string;
  url: string;
  type?: string;
};

export type MessageReply = {
  id: string;
  senderName: string;
  senderRole: UserRole | 'student' | 'teacher' | 'admin';
  senderEmail?: string;
  senderPhotoUrl?: string;
  message: string;
  attachments?: MessageAttachment[];
  createdAt: string;
};

export type WhatsAppGroupConfig = {
  groupName: string;
  groupInviteUrl: string;
  description?: string;
  activeCohort?: string;
  lastBroadcastAt?: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type AppMessage = {
  id: string;
  subject: string;
  category: MessageCategory;
  priority: MessagePriority;
  senderName: string;
  senderRole: UserRole | 'student' | 'teacher' | 'admin';
  senderEmail?: string;
  senderStudentId?: string;
  recipientType: 'admin' | 'teacher' | 'student' | 'all_staff' | 'all_students' | 'group' | 'whatsapp_group';
  recipientName?: string; // e.g. "All Administration & Faculty", "All Enrolled Students", "HTEIM WhatsApp Community Group", etc.
  recipientEmail?: string;
  courseCode?: string;
  content: string;
  attachments?: MessageAttachment[];
  createdAt: string;
  updatedAt: string;
  isReadByRecipient: boolean;
  isReadBySender: boolean;
  status: 'open' | 'in_progress' | 'resolved' | 'archived';
  replies: MessageReply[];
  isGroupMessage?: boolean;
  groupType?: 'all_students' | 'cohort' | 'whatsapp_group' | 'pending_tuition';
  whatsappGroupUrl?: string;
  channelsSent?: ('portal' | 'whatsapp' | 'email' | 'sms')[];
};

export type PaymentPlanType = 'full' | 'monthly' | 'scholarship' | 'custom' | 'Monthly Installments' | 'Pay In Full' | 'Financial Aid / Scholarship';

export type ExcusedAbsenceRequest = {
  id: string;
  studentId?: string; // Foreign Key / UUID
  studentName?: string;
  student?: {
    id: string;
    name: string;
  };
  classDayId: string;
  classDayName?: string;
  date?: string;
  reason: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'Pending' | 'Approved' | 'Rejected';
  documentUrl?: string;
  proofDocumentName?: string;
  approvedBy?: string;
  reviewedBy?: string;
  reviewNote?: string;
};

export type AttendanceCorrectionAudit = {
  id: string;
  studentId?: string; // Foreign Key / UUID
  studentName?: string;
  student?: {
    id: string;
    name: string;
  };
  classDayId: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  reason: string;
  timestamp: string;
};

export type PINCheckinSession = {
  id: string;
  classDayId: string;
  pin: string;
  active: boolean;
  expiresAt: string;
  checkedInStudents: string[];
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  author?: string;
  sentBy?: string;
  targetAudience?: 'all' | 'students' | 'faculty';
  targetRole?: 'all' | 'students' | 'student' | 'faculty' | 'admin' | 'teacher';
  targetCohort?: string;
  targetModule?: string;
  targetPaymentStatus?: string;
  templateCategory?: string;
  createdAt: string;
  scheduledFor?: string;
  isPublished?: boolean;
  priority?: 'normal' | 'urgent';
  readByStudentNames?: string[];
  channels?: ('portal' | 'email' | 'sms' | 'whatsapp')[];
};

export type StudentTimelineEvent = {
  id: string;
  type: string;
  title: string;
  date: string;
  description?: string;
  studentName?: string;
  badgeColor?: string;
};

export type StudentNote = {
  id: string;
  studentName: string;
  author: string;
  authorRole: 'admin' | 'teacher';
  text: string;
  date?: string;
  createdAt?: string;
  isPrivate?: boolean;
};

export type GraduationChecklist = {
  id?: string;
  studentName: string;
  allModulesPassed?: boolean;
  attendanceVerified?: boolean;
  tuitionCleared?: boolean;
  practicumCompleted?: boolean;
  approvedForGraduation?: boolean;
  attendanceRate?: number;
  averageGrade?: number;
  isReadyForGraduation?: boolean;
  meetsAttendance?: boolean;
  meetsGrade?: boolean;
  meetsAssignments?: boolean;
  assignmentsCompleted?: number;
  totalAssignments?: number;
  tuitionPaid?: boolean;
};

export type CertificateRecord = {
  id: string;
  studentName: string;
  levelName: string;
  issueDate: string;
  certificateNumber: string;
  signedBy: string;
  pdfUrl?: string;
};

export interface Cohort {
  id: string; // e.g., 'cohort_2026', 'cohort_2027'
  name: string; // 'Class of 2026'
  academicYear: number; // 2026
  term?: string; // 'Spring / Term 2'
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isArchived: boolean;
  isCurrent: boolean;
  description?: string;
  sheetUrl?: string; // Optional custom sheet URL for this cohort
  sheetTabPattern?: string; // e.g., '2026', 'Attendance_2026', 'Class of 2026'
  studentCount?: number;
  targetTuition?: number;
  themeColor?: string;
}

export const DEFAULT_COHORTS: Cohort[] = [
  {
    id: 'cohort_2026',
    name: 'Class of 2026',
    academicYear: 2026,
    term: 'Spring 2026 • Term 2',
    startDate: '2026-01-10',
    endDate: '2026-12-15',
    isArchived: false,
    isCurrent: true,
    description: 'Current active ministerial diploma & certificate cohort (Foundation to Executive Leadership).',
    themeColor: 'indigo',
    sheetTabPattern: '2026'
  },
  {
    id: 'cohort_2027',
    name: 'Class of 2027',
    academicYear: 2027,
    term: 'Fall 2026 / Spring 2027',
    startDate: '2027-01-09',
    endDate: '2027-12-14',
    isArchived: false,
    isCurrent: false,
    description: 'Upcoming academic year cohort for prospective & enrolled ministry students.',
    themeColor: 'emerald',
    sheetTabPattern: '2027'
  }
];

export interface InstallmentMilestone {
  id: string;
  milestoneNumber: number;
  dueDate: string;
  amount: number;
  isPaid: boolean;
  paidDate?: string;
  receiptNumber?: string;
  notes?: string;
}

export interface StudentInstallmentPlan {
  id: string;
  studentName: string;
  studentId: string;
  totalTuition: number;
  initialDeposit: number;
  remainingBalance: number;
  frequency: 'monthly' | 'biweekly';
  totalMilestones: number;
  milestones: InstallmentMilestone[];
  createdAt: string;
  status: 'active' | 'completed' | 'defaulted';
  notes?: string;
}

export interface SponsorshipDonation {
  id: string;
  sponsorName: string;
  organization?: string;
  sponsorEmail?: string;
  sponsorPhone?: string;
  recipientStudentName: string; // or 'General Ministry Fund'
  amount: number;
  date: string;
  sponsorshipType: 'Full Tuition' | 'Partial Grant (50%)' | 'Custom Ministry Grant' | 'Emergency Aid';
  notes?: string;
  receiptNumber: string;
  status: 'verified' | 'pledged';
}

export interface OfflineQueueItem {
  id: string;
  type: 'attendance_checkin' | 'student_note' | 'grade_update' | 'payment_record';
  description: string;
  timestamp: string;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  retryCount: number;
  payload: any;
}

export interface MergeConflict {
  studentName: string;
  classDay: string;
  localStatus: 'present' | 'absent';
  sheetsStatus: 'present' | 'absent';
  sheetsScore: string;
  sheetsTimestamp: string;
}

export interface RecentSheet {
  id: string;
  url: string;
  title: string;
  lastLoaded: string;
}

