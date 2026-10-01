import React, { Suspense } from 'react';
import { ScheduleTab } from '../components/ScheduleTab';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { DashboardSkeleton } from '../components/DashboardSkeleton';

export interface SchedulePageProps {
  classDays: any[];
  userRole?: string;
  onDeleteClassDay: (dayId: string) => void;
  onClearClassDayRecords: (dayId: string) => void;
  onTakeAttendanceForDay?: (dayId: string) => void;
  schedules: any[];
  setSchedules: (schedules: any[] | ((prev: any[]) => any[])) => void;
  zoomExceptionNote: string;
  setZoomExceptionNote: (note: string) => void;
  hasZoomException: boolean;
  setHasZoomException: (has: boolean) => void;
}

export const SchedulePage: React.FC<SchedulePageProps> = (props) => {
  return (
    <Suspense fallback={<DashboardSkeleton label="Loading Calendar Events & Live Zoom Stream Schedules..." />}>
      <ErrorBoundary label="Schedule Tab">
        <ScheduleTab {...(props as any)} />
      </ErrorBoundary>
    </Suspense>
  );
};

export default SchedulePage;
