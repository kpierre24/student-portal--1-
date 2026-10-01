import React, { useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  FileText, 
  Database, 
  BarChart2, 
  RefreshCw, 
  ShieldCheck, 
  CreditCard 
} from 'lucide-react';
import { TabType } from '../../../types';
import { DashboardHeader } from './DashboardHeader';
import { WhatShouldIDoNextHero, ActionHeroItem } from './WhatShouldIDoNextHero';
import { QuickActions } from './QuickActions';
import { AttentionCard } from './AttentionCard';
import { ActivityFeed } from './ActivityFeed';
import { MetricCard } from '../../../components/ui/MetricCard';
import { AdminDashboardData } from '../hooks/useDashboard';

export interface AdminDashboardProps {
  data: AdminDashboardData;
  greetingTimeOfDay: string;
  onNavigate?: (tab: TabType) => void;
  onSyncDatabase?: () => Promise<void> | void;
  isCloudSyncing?: boolean;
  className?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  data,
  greetingTimeOfDay,
  onNavigate,
  onSyncDatabase,
  isCloudSyncing = false,
  className = '',
}) => {
  const quickActions = [
    {
      id: 'qa-students',
      label: 'Students Roster',
      description: 'Manage enrollments, profiles & transcripts',
      icon: <Users className="h-6 w-6" />,
      onClick: () => onNavigate?.('students'),
      tone: 'primary' as const,
    },
    {
      id: 'qa-finance',
      label: 'Finance & Tuition',
      description: 'Track receipts, installments & balances',
      icon: <DollarSign className="h-6 w-6" />,
      onClick: () => onNavigate?.('payments'),
      tone: 'success' as const,
    },
    {
      id: 'qa-reports',
      label: 'Reports & Analytics',
      description: 'Export audits, accreditation & certificates',
      icon: <BarChart2 className="h-6 w-6" />,
      onClick: () => onNavigate?.('reports'),
      tone: 'accent' as const,
    },
    {
      id: 'qa-sync',
      label: isCloudSyncing ? 'Syncing...' : 'Sync Cloud',
      description: 'Synchronize Google Sheets & cloud database',
      icon: <RefreshCw className={`h-6 w-6 ${isCloudSyncing ? 'animate-spin' : ''}`} />,
      onClick: () => {
        if (onSyncDatabase) {
          onSyncDatabase();
        } else {
          onNavigate?.('attendance');
        }
      },
      tone: 'info' as const,
    },
  ];

  const attentionItems = data.attentionItems.map((item) => ({
    ...item,
    onAction: item.actionTab ? () => onNavigate?.(item.actionTab!) : undefined,
  }));

  const primaryHeroAction = useMemo<ActionHeroItem>(() => {
    // 1. Attention needed items
    if (data.attentionItems.length > 0) {
      const topIssue = data.attentionItems[0];
      return {
        id: topIssue.id,
        badgeText: `${data.attentionItems.length} Issues Requiring Action`,
        badgeVariant: topIssue.priority === 'urgent' ? 'danger' : 'warning',
        questionPrompt: 'WHAT SHOULD I DO NEXT?',
        title: topIssue.title,
        subtitle: topIssue.description || 'Requires administrative attention.',
        actionLabel: topIssue.actionLabel || 'Triage Issue',
        actionTab: topIssue.actionTab || 'students',
        secondaryActions: [
          { label: 'Student Roster', tab: 'students' },
          { label: 'Tuition Balances', tab: 'payments' },
        ],
      };
    }

    // 2. Cloud sync pending
    if (!data.isDatabaseSynced) {
      return {
        id: 'hero-sync-cloud',
        badgeText: 'Cloud Sync Pending',
        badgeVariant: 'info',
        questionPrompt: 'WHAT SHOULD I DO NEXT?',
        title: 'Synchronize Academic Records with Cloud Database',
        subtitle: 'Sync recent attendance records, student profiles, and course data with remote database backup.',
        actionLabel: 'Sync Now',
        actionTab: 'attendance',
        secondaryActions: [
          { label: 'Reports', tab: 'reports' },
          { label: 'Students', tab: 'students' },
        ],
      };
    }

    return {
      id: 'hero-registry-healthy',
      badgeText: 'All Systems Operational',
      badgeVariant: 'success',
      questionPrompt: 'WHAT SHOULD I DO NEXT?',
      title: 'Review Registry Metrics & Cohort Performance',
      subtitle: `${data.totalStudents} enrolled students • ${data.attendanceRate}% overall attendance rate across modules.`,
      actionLabel: 'Manage Students',
      actionTab: 'students',
      secondaryActions: [
        { label: 'Finance & Payments', tab: 'payments' },
        { label: 'Audit Logs', tab: 'reports' },
      ],
    };
  }, [data]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Dashboard Header */}
      <DashboardHeader
        greeting={greetingTimeOfDay}
        userName="Administrator"
        role="admin"
        cohortName="School of Ministry Registry"
      />

      {/* 2. Immediate "What Should I Do Next?" Action Hero */}
      <WhatShouldIDoNextHero
        item={primaryHeroAction}
        role="admin"
        onNavigate={onNavigate}
      />

      {/* 3. SYSTEM OVERVIEW Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] dark:text-slate-400">
          SYSTEM OVERVIEW
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Enrolled Students"
            value={data.totalStudents}
            icon={<Users className="h-5 w-5" />}
            caption="Active academic registry"
            onClick={() => onNavigate?.('students')}
          />

          <MetricCard
            label="Attendance Rate"
            value={`${data.attendanceRate}%`}
            icon={<Calendar className="h-5 w-5" />}
            change={data.attendanceRate >= 75 ? 'Satisfactory' : 'Below 75% Threshold'}
            changeType={data.attendanceRate >= 75 ? 'increase' : 'decrease'}
            onClick={() => onNavigate?.('attendance')}
          />

          <MetricCard
            label="Outstanding Tuition"
            value={data.outstandingTuitionFormatted}
            icon={<DollarSign className="h-5 w-5" />}
            caption="Receivables pending"
            onClick={() => onNavigate?.('payments')}
          />

          <MetricCard
            label="Pending Grades"
            value={data.pendingGradesCount}
            icon={<FileText className="h-5 w-5" />}
            caption="Ready for moderation"
            onClick={() => onNavigate?.('exams')}
          />
        </div>
      </div>

      {/* 3. ATTENTION REQUIRED & ACTIVITY FEED */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AttentionCard
          title="ATTENTION REQUIRED"
          items={attentionItems}
        />

        <ActivityFeed
          title="SYSTEM & AUDIT LOGS"
        />
      </div>

      {/* 4. QUICK ACTIONS */}
      <QuickActions actions={quickActions} columns={4} />
    </div>
  );
};
