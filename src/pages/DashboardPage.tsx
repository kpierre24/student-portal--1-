import React, { Suspense } from 'react';
import { HomeTab } from '../components/HomeTab';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { DashboardSkeleton } from '../components/DashboardSkeleton';

export interface DashboardPageProps {
  onNavigate: (tab: any) => void;
  appUser: any;
  onOpenLogin?: () => void;
  onLogout?: () => void;
  onOpenPresentationDemo?: () => void;
  studentsCount?: number;
  students?: any[];
  payments?: any[];
  classDays?: any[];
  records?: any[];
  coursesCount?: number;
  classDaysCount?: number;
  avgAttendanceRate?: number;
  onPlayIntro?: () => void;
  pendingAssignmentsCount?: number;
  uncollectedTuitionAmount?: number;
  libraryResourcesCount?: number;
  nextClassTitle?: string;
  isCloudSyncing?: boolean;
  cloudSyncError?: string | null;
  lastSyncedTime?: any;
  onPushToCloud?: () => Promise<void> | void;
  userEmail?: string;
  supabaseTableMissing?: boolean;
  onVerifySetup?: () => Promise<void> | void;
  atRiskThreshold?: number;
  customAssignments?: any[];
  submissions?: any[];
  facultyTeachers?: any[];
  onSaveFacultyTeachers?: (teachers: any[]) => void;
  onTakeQuiz?: (quiz: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = (props) => {
  return (
    <Suspense fallback={<DashboardSkeleton label="Loading Dashboard Overview..." />}>
      <ErrorBoundary label="Dashboard Tab">
        <HomeTab {...(props as any)} />
      </ErrorBoundary>
    </Suspense>
  );
};

export default DashboardPage;
