import React, { Suspense } from 'react';
import { LiveClassroomWorkspace, LiveClassroomWorkspaceProps } from '../features/live-classroom/LiveClassroomWorkspace';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { DashboardSkeleton } from '../components/DashboardSkeleton';

export interface ClassroomPageProps extends LiveClassroomWorkspaceProps {}

export const ClassroomPage: React.FC<ClassroomPageProps> = (props) => {
  return (
    <Suspense fallback={<DashboardSkeleton label="Initializing WebRTC Live Video Classroom Feed..." />}>
      <ErrorBoundary label="Live Classroom & Video Feed Studio">
        <LiveClassroomWorkspace {...props} />
      </ErrorBoundary>
    </Suspense>
  );
};

export default ClassroomPage;
