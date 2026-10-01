import { CustomAssignment, AssignmentSubmission, TabType } from '../../types';
import { AppUser } from '../../lib/userAuth';

export type AssessmentTab = 'assignments' | 'quizzes' | 'grades' | 'gradebook' | 'manage';

export interface AssessmentItem {
  id: string;
  title: string;
  courseTitle: string;
  moduleTitle?: string;
  type: 'assignment' | 'quiz' | 'exam' | 'project';
  dueDate: string;
  points: number;
  description?: string;
  isPublished: boolean;
  submissionsCount?: number;
  totalStudentsCount?: number;
  mySubmission?: {
    id: string;
    submittedAt: string;
    status: 'submitted' | 'graded' | 'pending';
    score?: number;
    feedback?: string;
    fileUrl?: string;
  };
}

export interface StudentGradeRecord {
  id: string;
  courseTitle: string;
  moduleCode: string;
  attendanceRate: number;
  averageScore: number;
  assignmentsCompleted: number;
  totalAssignments: number;
  status: 'honors' | 'satisfactory' | 'at_risk';
  breakdown: Array<{
    title: string;
    type: 'assignment' | 'quiz' | 'exam';
    score: number;
    maxScore: number;
    date: string;
  }>;
}

export interface TeacherReviewItem {
  id: string;
  submissionId: string;
  assignmentTitle: string;
  studentName: string;
  studentEmail?: string;
  submittedAt: string;
  status: 'pending' | 'graded';
  currentScore?: number;
  maxScore: number;
  fileUrl?: string;
}
