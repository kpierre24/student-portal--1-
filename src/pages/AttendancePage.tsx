import React, { Suspense } from 'react';
import { AttendanceTab as AttendanceWorkspace } from '../features/attendance/AttendanceWorkspace';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { DashboardSkeleton } from '../components/DashboardSkeleton';

export interface AttendancePageProps {
  [key: string]: any;
}

export const AttendancePage: React.FC<AttendancePageProps> = (props) => {
  return (
    <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex flex-col w-full">
      <Suspense fallback={<DashboardSkeleton label="Loading Attendance Records & Session Matrix..." />}>
        <ErrorBoundary label="Attendance Workspace">
          <AttendanceWorkspace {...(props as any)} />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
};

export default AttendancePage;
