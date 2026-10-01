import React, { Suspense } from 'react';
import { LibraryTab } from '../features/library/components/LibraryTab';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { DashboardSkeleton } from '../components/DashboardSkeleton';

export interface LibraryPageProps {
  userRole?: string;
  resources: any[];
  setResources: (resources: any[] | ((prev: any[]) => any[])) => void;
  classroomMedia: any[];
  setClassroomMedia: (media: any[] | ((prev: any[]) => any[])) => void;
  studentName?: string;
  onOpenNotes?: () => void;
  onOpenInBible?: () => void;
  onOpenDiagnostics?: () => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = (props) => {
  return (
    <Suspense fallback={<DashboardSkeleton label="Loading Video Archives & Syllabus Resource Files..." />}>
      <ErrorBoundary label="Library Tab">
        <LibraryTab {...(props as any)} />
      </ErrorBoundary>
    </Suspense>
  );
};

export default LibraryPage;
