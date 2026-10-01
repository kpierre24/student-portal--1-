import { GradeLifecycleStatus } from '../../types';

export type CanonicalGradeStage = 'SUBMITTED' | 'GRADED' | 'MODERATION' | 'RELEASED' | 'LOCKED';

export type GradeClassification = 'Honor Roll' | 'Satisfactory' | 'At-Risk';

export interface RubricScoreItem {
  criterionId: string;
  criterionName: string;
  maxPoints: number;
  scoreEarned: number;
  comments?: string;
}

export interface GradeRecord {
  id: string;
  submissionId: string;
  studentId?: string;
  studentName: string;
  studentNumber?: string;
  assignmentId: string;
  assignmentTitle: string;
  courseCode: string;
  courseTitle?: string;
  cohortId?: string;
  score: number;
  maxPoints: number;
  percentage: number;
  feedback?: string;
  status: CanonicalGradeStage | GradeLifecycleStatus | string;
  rubricScores?: RubricScoreItem[];
  moderatedBy?: string;
  moderatedAt?: string;
  releasedBy?: string;
  releasedAt?: string;
  lockedBy?: string;
  lockedAt?: string;
  overrideReason?: string;
  submittedAt?: string;
  updatedAt?: string;
}

export interface GradeFilterOptions {
  search?: string;
  courseCode?: string;
  status?: string;
  studentId?: string;
  studentName?: string;
  cohortId?: string;
}

export interface GradeStats {
  totalGrades: number;
  averagePercentage: number;
  submittedCount: number;
  gradedCount: number;
  moderationCount: number;
  releasedCount: number;
  lockedCount: number;
  honorRollCount: number;
  satisfactoryCount: number;
  atRiskCount: number;
}

export interface GradeInputData {
  submissionId: string;
  assignmentId?: string;
  studentId?: string;
  courseCode?: string;
  score: number;
  feedback?: string;
  rubricScores?: RubricScoreItem[];
  overrideReason?: string;
}

export interface GradeTransitionData {
  submissionId: string;
  targetStatus: CanonicalGradeStage;
  reason?: string;
}

export interface GradeOverrideData {
  submissionId: string;
  score: number;
  feedback?: string;
  reason: string;
}
