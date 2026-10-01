import { UserRole } from '../../lib/userAuth';
import { CustomAssignment, AssignmentSubmission, AppNotification, QuizAssignment, QuizSubmission } from '../../types';

export type StudentScoreRecord = {
  name: string;
  scoreStr: string;
  percentage: number | null;
  attendedSessions: number;
  totalSessions: number;
  attendanceRate: number;
  attendanceByDay?: Record<string, { present: boolean; timestamp?: string; score?: string }>;
};

export interface ExaminationsPageProps {
  students: StudentScoreRecord[];
  allQuizSheets: string[];
  rubricScores: Record<string, { participation: number; scripture: number; assignment: number }>;
  onUpdateRubric: (studentName: string, key: 'participation' | 'scripture' | 'assignment', val: number) => void;
  userRole?: UserRole;
  currentStudentName?: string;
  onNotificationCreated?: (notif: AppNotification) => void;
  customAssignments: CustomAssignment[];
  setCustomAssignments: React.Dispatch<React.SetStateAction<CustomAssignment[]>>;
  submissions: AssignmentSubmission[];
  setSubmissions: React.Dispatch<React.SetStateAction<AssignmentSubmission[]>>;

  // Google Sheets Quiz Sync Props
  googleUser?: any;
  googleToken?: string | null;
  isLoggingIn?: boolean;
  onGoogleLogin?: () => void;
  onGoogleLogout?: () => void;
  sheetUrl?: string;
  setSheetUrl?: (url: string) => void;
  onLoadSheets?: (e?: React.FormEvent, customUrl?: string) => Promise<void>;
  isLoadingSheets?: boolean;
  lastSyncedTime?: string | null;
  recentSheets?: { id: string; title: string; url: string; lastLoaded?: string }[];
  onRemoveRecentSheet?: (id: string, e: React.MouseEvent) => void;
}

export type SubTabType = 'assignments' | 'quizzes' | 'admin_dashboard';
