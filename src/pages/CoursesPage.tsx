import React, { Suspense } from 'react';
import { CoursesTab } from '../components/CoursesTab';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { DashboardSkeleton } from '../components/DashboardSkeleton';

export interface CoursesPageProps {
  [key: string]: any;
}

export const CoursesPage: React.FC<CoursesPageProps> = (props) => {
  return (
    <Suspense fallback={<DashboardSkeleton label="Loading Curriculum Modules..." />}>
      <ErrorBoundary label="Courses & Syllabus Module">
        <CoursesTab {...(props as any)} />
      </ErrorBoundary>
    </Suspense>
  );
};

export default CoursesPage;
