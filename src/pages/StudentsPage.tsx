import React, { Suspense } from 'react';
import { StudentsTab } from '../components/StudentsTab';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { DashboardSkeleton } from '../components/DashboardSkeleton';

export interface StudentsPageProps {
  [key: string]: any;
}

export const StudentsPage: React.FC<StudentsPageProps> = (props) => {
  return (
    <Suspense fallback={<DashboardSkeleton label="Loading Student Roster & Academic Profiles..." />}>
      <ErrorBoundary label="Students Directory">
        <StudentsTab {...(props as any)} />
      </ErrorBoundary>
    </Suspense>
  );
};

export default StudentsPage;
