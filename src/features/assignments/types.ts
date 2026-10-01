import { CustomAssignment, AssignmentSubmission, QuizAssignment, QuizSubmission, GradeLifecycleStatus } from '../../types';

export type AssignmentType = 'document' | 'quiz';

export type AssignmentStatusFilter = 'all' | 'published' | 'draft' | 'overdue' | 'active';

export type SubmissionStatusFilter = 'all' | 'submitted' | 'graded' | 'correction_returned' | 'pending_review';

export interface AssignmentFormData {
  id?: string;
  title: string;
  courseCode: string;
  moduleTrack?: string;
  cohortId?: string;
  description: string;
  dueDate: string;
  maxPoints: number;
  type?: AssignmentType;
  teacherAttachmentUrl?: string;
  teacherAttachmentName?: string;
  published?: boolean;
  isDraft?: boolean;
  quizData?: QuizAssignment;
  isGroupAssignment?: boolean;
  groups?: import('../../types').AssignmentGroup[];
}

export interface SubmissionFormData {
  assignmentId: string;
  studentName: string;
  studentId?: string;
  studentNotes?: string;
  studentTypedResponse?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}

export interface GradeFormData {
  submissionId: string;
  score: number;
  teacherFeedback: string;
  teacherCorrectedFileUrl?: string;
  teacherCorrectedFileName?: string;
  teacherCorrectedFileType?: string;
  status: GradeLifecycleStatus | 'Graded' | 'Correction Returned' | 'Pending Review';
}

export interface AssignmentStats {
  totalAssignments: number;
  publishedCount: number;
  draftCount: number;
  totalSubmissions: number;
  pendingGradingCount: number;
  gradedCount: number;
  averageScore: number;
}

export type { CustomAssignment, AssignmentSubmission, QuizAssignment, QuizSubmission, GradeLifecycleStatus };
