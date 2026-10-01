import { UserRole } from '../../../../types/rbac';

export type QuizQuestionType =
  | 'multiple_choice'
  | 'checkboxes'
  | 'true_false'
  | 'short_answer'
  | 'fill_blank'
  | 'paragraph';

export type QuizLifecycleStatus =
  | 'DRAFT'
  | 'VALIDATING'
  | 'READY'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'OPEN'
  | 'CLOSED'
  | 'GRADING'
  | 'GRADED'
  | 'ARCHIVED';

export type AttemptStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'AUTO_SUBMITTED'
  | 'GRADING'
  | 'GRADED'
  | 'MODERATION'
  | 'RELEASED'
  | 'ABANDONED'
  | 'EXPIRED';

export type GradingStatus =
  | 'auto_graded'
  | 'teacher_reviewed'
  | 'moderated'
  | 'released';

export type QuizGradeCalculation = 'highest' | 'latest' | 'average' | 'first';

export type GradeReleasePolicy = 'immediate' | 'manual';

export interface QuizQuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean; // For authoring only; stripped before sending to students
}

export interface QuizRubricCriterion {
  id?: string;
  name: string;
  description?: string;
  weightPercentage: number; // e.g. 30 for 30%
  maxScore: number;
}

export interface QuizRubric {
  id: string;
  name: string;
  description?: string;
  criteria: QuizRubricCriterion[];
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  type: QuizQuestionType;
  options: QuizQuestionOption[];
  correctOptionId?: string; // multiple_choice, true_false
  correctOptionIds?: string[]; // checkboxes
  acceptableAnswers?: string[]; // short_answer, fill_blank
  weight: number; // points
  explanation?: string;
  feedbackCorrect?: string;
  feedbackIncorrect?: string;
  required?: boolean;
  imageUrl?: string;
  sectionTitle?: string;
  gradingMode?: 'exact' | 'case_insensitive' | 'trim' | 'multiple' | 'manual';
  rubric?: QuizRubric;
  topic?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

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

export interface QuizSettings {
  timeLimitMinutes?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showCorrectAnswers?: boolean;
  showPointValues?: boolean;
  showFeedback?: boolean;
  passingScorePercentage?: number; // default 75%
  allowMultipleAttempts?: boolean;
  maxAttempts?: number; // 1, 2, 3, etc.
  gradeCalculation?: QuizGradeCalculation;
  gradeReleasePolicy?: GradeReleasePolicy;
  requireAllQuestionsAnswered?: boolean;
  collectStudentEmail?: boolean;
  audienceCohortId?: string; // e.g. "Class of 2026", "all"
  availableFromDate?: string; // YYYY-MM-DD
  availableFromTime?: string; // HH:MM
  closeDate?: string; // YYYY-MM-DD
  closeTime?: string; // HH:MM
  availableFrom?: string; // ISO string
  availableUntil?: string; // ISO string
  poolConfig?: QuizPoolConfig;
  randomizeFromPool?: boolean;
}

export interface QuizVersion {
  id: string;
  quizId: string;
  versionNumber: number;
  title: string;
  description?: string;
  instructions?: string;
  questions: QuizQuestion[];
  totalPoints: number;
  settings: QuizSettings;
  createdAt: string;
  createdBy?: string;
  publishedAt?: string;
  changeLog?: string;
  isPublished: boolean;
  isImmutable: boolean; // Once an attempt is created, this version becomes immutable
}

export interface QuizAssignmentTarget {
  id: string;
  quizId: string;
  quizVersionId: string;
  courseId?: string;
  cohortId?: string;
  assignedBy: string;
  assignedAt: string;
  availableFrom?: string;
  availableUntil?: string;
  dueDate?: string;
  targetType: 'cohort' | 'course' | 'individual' | 'all';
  targetIds?: string[];
  status: 'active' | 'scheduled' | 'closed';
}

export interface QuizResponse {
  questionId: string;
  answer?: any;
  selectedOptionId?: string;
  selectedOptionIds?: string[];
  textAnswer?: string;
  savedAt?: string;
  autoScore?: number;
  teacherScore?: number;
  finalScore?: number;
  gradingStatus?: GradingStatus;
  teacherFeedback?: string;
  rubricEvaluation?: Record<string, number>;
  isCorrect?: boolean;
  pointsEarned?: number; // legacy compatibility
  correctOptionId?: string;
  correctOptionIds?: string[];
  acceptableAnswers?: string[];
  explanation?: string;
  feedbackCorrect?: string;
  feedbackIncorrect?: string;
  quizVersionId?: string;
  comment?: string;
  instructorFeedback?: string;
}

export type QuizSubmissionResponse = QuizResponse;

export interface QuizGrade {
  id?: string;
  attemptId?: string;
  studentId?: string;
  quizId?: string;
  autoScore: number;
  teacherScore?: number;
  moderatedScore?: number;
  releasedScore?: number;
  maxPoints: number;
  percentage: number;
  gradeStatus: GradingStatus;
  gradedBy?: string;
  gradedAt?: string;
  moderatedBy?: string;
  moderatedAt?: string;
  releasedBy?: string;
  releasedAt?: string;
  adjustmentReason?: string;
  feedback?: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizVersionId: string;
  assignmentId?: string;
  shareCode?: string;
  quizTitle?: string;
  studentId?: string;
  studentName: string;
  studentEmail?: string;
  attemptNumber?: number;
  status: AttemptStatus | 'in_progress' | 'submitted' | 'graded' | 'released';
  startedAt: string;
  expiresAt?: string;
  submittedAt?: string;
  lastSavedAt?: string;
  updatedAt?: string;
  releasedAt?: string;
  timeSpentSeconds: number;
  autoSubmitted?: boolean;
  responses: QuizResponse[];
  grade?: QuizGrade;
  // Denormalized fields for quick list views & analytics
  score: number;
  totalScore?: number;
  maxPoints: number;
  totalPossible?: number;
  percentage: number;
  scorePercentage?: number;
  gradingStatus?: GradingStatus | 'auto_graded' | 'manual_review' | 'moderated';
  teacherFeedback?: string;
  feedback?: string;
  feedbackGiven?: boolean;
  manualAdjustmentPoints?: number;
  manualAdjustmentReason?: string;
  moderatorName?: string;
  moderationReason?: string;
  isReleased?: boolean;
}

export type QuizSubmission = QuizAttempt;

export interface QuizAuditLog {
  id: string;
  quizId: string;
  quizVersionId?: string;
  attemptId?: string;
  actorUserId: string;
  actorRole: string;
  action:
    | 'quiz_created'
    | 'quiz_edited'
    | 'version_created'
    | 'quiz_published'
    | 'quiz_unpublished'
    | 'quiz_assigned'
    | 'attempt_started'
    | 'response_saved'
    | 'attempt_submitted'
    | 'attempt_auto_submitted'
    | 'grade_generated'
    | 'grade_changed'
    | 'feedback_added'
    | 'grade_moderated'
    | 'grade_released'
    | 'attempt_reopened'
    | 'deadline_extended'
    | 'attempt_invalidated';
  timestamp: string;
  details?: Record<string, any>;
  reason?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  instructions?: string;
  courseCode: string;
  courseId?: string;
  moduleTrack?: string;
  category: string;
  createdBy: string;
  instructorName?: string;
  createdAt: string;
  updatedAt: string;
  status: QuizLifecycleStatus;
  currentVersionId: string;
  isPublished: boolean;
  isTemplate?: boolean;
  archivedAt?: string;
  shareCode: string;
  timeLimitMinutes?: number;
  dueDate?: string;
  availableFrom?: string;
  availableUntil?: string;
  totalPoints: number;
  questions: QuizQuestion[];
  settings: QuizSettings;
  versions?: QuizVersion[];
  rubrics?: QuizRubric[];
  pools?: QuizPoolConfig[];
}

export interface QuizValidationError {
  field?: string;
  questionIndex?: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface QuizValidationResult {
  isValid: boolean;
  errors: QuizValidationError[];
  warnings: string[];
}

export interface QuestionPerformanceMetric {
  questionId: string;
  questionText: string;
  type: QuizQuestionType;
  totalAttempts: number;
  correctCount: number;
  incorrectCount: number;
  correctPercentage: number;
  averageScore: number;
  maxPoints: number;
  mostCommonWrongAnswer?: string;
  isHighFailureRate?: boolean; // Correct < 50%
  isLowDiscrimination?: boolean;
  isAmbiguous?: boolean;
}

export interface QuizAnalyticsSummary {
  quizId: string;
  title: string;
  totalAssigned: number;
  totalStarted: number;
  totalSubmitted: number;
  incompleteCount: number;
  averageScore: number;
  medianScore: number;
  highestScore: number;
  lowestScore: number;
  passRatePercentage: number;
  averageCompletionTimeSeconds: number;
  scoreDistribution: { range: string; count: number; percentage: number }[];
  questionPerformance: QuestionPerformanceMetric[];
}
