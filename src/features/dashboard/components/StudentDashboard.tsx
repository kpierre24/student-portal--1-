import React, { useMemo } from 'react';
import { 
  Calendar, 
  BookOpen, 
  FileText, 
  DollarSign, 
  Award, 
  PlayCircle,
  ArrowRight
} from 'lucide-react';
import { TabType } from '../../../types';
import { DashboardHeader } from './DashboardHeader';
import { WhatShouldIDoNextHero, ActionHeroItem } from './WhatShouldIDoNextHero';
import { UpcomingCard } from './UpcomingCard';
import { ProgressCard } from './ProgressCard';
import { QuickActions } from './QuickActions';
import { WhatsNextCard } from '../../../components/ui/WhatsNextCard';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { StudentDashboardData } from '../hooks/useDashboard';

export interface StudentDashboardProps {
  data: StudentDashboardData;
  greetingTimeOfDay: string;
  onNavigate?: (tab: TabType) => void;
  className?: string;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  data,
  greetingTimeOfDay,
  onNavigate,
  className = '',
}) => {
  const quickActions = [
    {
      id: 'qa-schedule',
      label: 'Class Schedule',
      description: 'View upcoming sessions & lectures',
      icon: <Calendar className="h-6 w-6" />,
      onClick: () => onNavigate?.('schedule'),
      tone: 'primary' as const,
    },
    {
      id: 'qa-exams',
      label: 'Assignments & Quizzes',
      description: 'Check pending homework and tests',
      icon: <FileText className="h-6 w-6" />,
      onClick: () => onNavigate?.('exams'),
      tone: 'accent' as const,
      badge: 'Due Soon',
    },
    {
      id: 'qa-library',
      label: 'Curriculum Library',
      description: 'Download class notes & handouts',
      icon: <BookOpen className="h-6 w-6" />,
      onClick: () => onNavigate?.('library'),
      tone: 'info' as const,
    },
    {
      id: 'qa-payment',
      label: 'Tuition & Receipts',
      description: 'View tuition balance & statements',
      icon: <DollarSign className="h-6 w-6" />,
      onClick: () => onNavigate?.('payments'),
      tone: 'success' as const,
    },
  ];

  const primaryHeroAction = useMemo<ActionHeroItem>(() => {
    // 1. Check at-risk attendance trigger (< 75%)
    if (data.attendanceRate < 75) {
      return {
        id: 'hero-attendance',
        badgeText: 'Action Required',
        badgeVariant: 'danger',
        questionPrompt: 'WHAT SHOULD I DO NEXT?',
        title: 'Review Attendance Record & Contact Tutor',
        subtitle: `Your attendance is currently ${data.attendanceRate}%, which is below the 75% institutional requirement. Verify your attendance entries or speak with your tutor.`,
        actionLabel: 'View Attendance',
        actionTab: 'attendance',
        secondaryActions: [
          { label: 'View Schedule', tab: 'schedule' },
          { label: 'Message Faculty', tab: 'messages' },
        ],
      };
    }

    // 2. Next urgent item from whatsNext
    const highestPriority = data.whatsNext[0];
    if (highestPriority) {
      return {
        id: highestPriority.id,
        badgeText: highestPriority.priority === 'high' ? 'High Priority' : 'Next Up',
        badgeVariant: highestPriority.priority === 'high' ? 'warning' : 'info',
        questionPrompt: 'WHAT SHOULD I DO NEXT?',
        title: highestPriority.title,
        subtitle: highestPriority.description,
        timeContext: highestPriority.dueDate,
        actionLabel: highestPriority.actionLabel,
        actionTab: highestPriority.actionTab,
        secondaryActions: [
          { label: 'Class Schedule', tab: 'schedule' },
          { label: 'Library Handouts', tab: 'library' },
        ],
      };
    }

    // 3. Fallback to next upcoming class
    return {
      id: 'hero-next-class',
      badgeText: 'Upcoming Session',
      badgeVariant: 'primary',
      questionPrompt: 'WHAT SHOULD I DO NEXT?',
      title: `Prepare for ${data.nextClass.title}`,
      subtitle: `${data.nextClass.dayTime} • ${data.nextClass.location} • Instructor: ${data.nextClass.instructor}`,
      actionLabel: 'View Class Details',
      actionTab: 'schedule',
      secondaryActions: [
        { label: 'Assignments', tab: 'exams' },
        { label: 'Course Library', tab: 'library' },
      ],
    };
  }, [data]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Header with personalized greeting */}
      <DashboardHeader
        greeting={greetingTimeOfDay}
        userName={data.studentName}
        role="student"
        cohortName="Class of 2026"
      />

      {/* 2. Immediate "What Should I Do Next?" Action Hero */}
      <WhatShouldIDoNextHero
        item={primaryHeroAction}
        role="student"
        onNavigate={onNavigate}
      />

      {/* 3. NEXT CLASS & YOUR PROGRESS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UpcomingCard
          title="NEXT CLASS"
          courseTitle={data.nextClass.title}
          dateTime={data.nextClass.dayTime}
          location={data.nextClass.location}
          instructor={data.nextClass.instructor}
          onViewClass={() => onNavigate?.('schedule')}
          actionLabel="View Class"
        />

        <ProgressCard
          title="YOUR PROGRESS"
          attendanceRate={data.attendanceRate}
          assignmentRate={data.assignmentRate}
          averageScore={data.averageScore}
        />
      </div>

      {/* 3. Middle Row: WHAT'S NEXT? & CONTINUE LEARNING */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* WHAT'S NEXT Prioritized List (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] dark:text-slate-400">
              WHAT'S NEXT?
            </h3>
            <span className="text-xs text-[var(--color-text-muted)]">
              Prioritized for your cohort
            </span>
          </div>

          <div className="space-y-3">
            {data.whatsNext.map((item) => (
              <WhatsNextCard
                key={item.id}
                title={item.title}
                description={item.description}
                dueDate={item.dueDate}
                actionLabel={item.actionLabel}
                onAction={() => onNavigate?.(item.actionTab)}
                priority={item.priority}
                type={item.type}
              />
            ))}
          </div>
        </div>

        {/* CONTINUE LEARNING Card (1 col) */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] dark:text-slate-400">
            CONTINUE LEARNING
          </h3>

          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] dark:text-sky-400">
                Active Module
              </span>
              <Badge variant="info" size="sm">
                In Progress
              </Badge>
            </div>

            <div>
              <h4 className="text-base font-black text-[var(--color-text)] dark:text-slate-100 font-sans">
                {data.continueLearning.courseTitle}
              </h4>
              <p className="mt-1 text-xs text-[var(--color-text-muted)] dark:text-slate-400">
                {data.continueLearning.moduleTitle}
              </p>
            </div>

            {/* Progress bar visual: e.g. ████████░░ 80% */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[var(--color-text-muted)]">Progress</span>
                <span className="text-[var(--color-primary)] dark:text-sky-400">
                  {data.continueLearning.progressPercent}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)] transition-all dark:bg-sky-500"
                  style={{ width: `${data.continueLearning.progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] text-right">
                {data.continueLearning.completedLectures} of {data.continueLearning.totalLectures} lectures completed
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={() => onNavigate?.('courses')}
              leftIcon={<PlayCircle className="h-4 w-4" />}
            >
              Resume Lesson
            </Button>
          </Card>
        </div>
      </div>

      {/* 4. Quick Actions */}
      <QuickActions actions={quickActions} columns={4} />
    </div>
  );
};
