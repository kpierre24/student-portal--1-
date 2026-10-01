// Main Dashboard Container & Role Views
export { Dashboard } from './components/Dashboard';
export type { DashboardProps } from './components/Dashboard';

export { StudentDashboard } from './components/StudentDashboard';
export type { StudentDashboardProps } from './components/StudentDashboard';

export { TeacherDashboard } from './components/TeacherDashboard';
export type { TeacherDashboardProps } from './components/TeacherDashboard';

export { AdminDashboard } from './components/AdminDashboard';
export type { AdminDashboardProps } from './components/AdminDashboard';

export { WhatShouldIDoNextHero } from './components/WhatShouldIDoNextHero';
export type { WhatShouldIDoNextHeroProps, ActionHeroItem } from './components/WhatShouldIDoNextHero';

// Subcomponents
export { DashboardHeader } from './components/DashboardHeader';
export type { DashboardHeaderProps } from './components/DashboardHeader';

export { QuickActions } from './components/QuickActions';
export type { QuickActionsProps, QuickActionItem } from './components/QuickActions';

export { UpcomingCard } from './components/UpcomingCard';
export type { UpcomingCardProps } from './components/UpcomingCard';

export { ProgressCard } from './components/ProgressCard';
export type { ProgressCardProps, ProgressItem } from './components/ProgressCard';

export { AttentionCard } from './components/AttentionCard';
export type { AttentionCardProps, AttentionItem } from './components/AttentionCard';

export { ActivityFeed } from './components/ActivityFeed';
export type { ActivityFeedProps, ActivityItem } from './components/ActivityFeed';

// Legacy components preserved for backwards compatibility
export { StatCard } from './components/StatCard';
export { AttendanceSummary } from './components/AttendanceSummary';
export { GradeSummary } from './components/GradeSummary';
export { UpcomingEvents } from './components/UpcomingEvents';

// Hooks
export { useDashboard } from './hooks/useDashboard';
export type {
  UseDashboardProps,
  StudentDashboardData,
  TeacherDashboardData,
  AdminDashboardData,
} from './hooks/useDashboard';

// Services
export * from './services/dashboardService';
