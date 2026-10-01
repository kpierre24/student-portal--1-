import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WhatsNextCard } from '../components/ui/WhatsNextCard';
import {
  StudentDashboard,
  TeacherDashboard,
  AdminDashboard,
  DashboardHeader,
  UpcomingCard,
  ProgressCard,
  AttentionCard,
  ActivityFeed,
  useDashboard,
} from '../features/dashboard';

describe('Phase 2 Role-Specific Dashboards & WhatsNextCard', () => {
  it('renders WhatsNextCard with prioritized action and handles clicks', () => {
    const handleStartQuiz = vi.fn();
    render(
      <WhatsNextCard
        title="Complete your quiz"
        description="Biblical Foundations"
        dueDate="Tomorrow at 11:59 PM"
        actionLabel="Start Quiz"
        onAction={handleStartQuiz}
        priority="high"
        type="quiz"
      />
    );

    expect(screen.getByText('Complete your quiz')).toBeDefined();
    expect(screen.getByText('Biblical Foundations')).toBeDefined();
    expect(screen.getByText('Tomorrow at 11:59 PM')).toBeDefined();

    const button = screen.getByText('Start Quiz');
    fireEvent.click(button);
    expect(handleStartQuiz).toHaveBeenCalledTimes(1);
  });

  it('renders StudentDashboard with NEXT CLASS, YOUR PROGRESS, WHATS NEXT, and CONTINUE LEARNING', () => {
    const handleNavigate = vi.fn();
    const studentData = {
      studentName: 'Hannah Abbott',
      attendanceRate: 92,
      assignmentRate: 84,
      averageScore: 88,
      nextClass: {
        title: 'Pastoral Leadership',
        dayTime: 'Saturday • 5:00 PM',
        location: 'Main Sanctuary',
        instructor: 'Senior Pastor',
        dateStr: 'This Saturday',
      },
      whatsNext: [
        {
          id: '1',
          title: 'Quiz due tomorrow',
          description: 'Hermeneutics Chapter 4',
          dueDate: 'Tomorrow',
          actionLabel: 'Start Quiz',
          actionTab: 'exams' as const,
          priority: 'high' as const,
          type: 'quiz' as const,
        },
        {
          id: '2',
          title: 'New course material',
          description: 'Session notes attached',
          dueDate: 'Today',
          actionLabel: 'View Library',
          actionTab: 'library' as const,
          priority: 'medium' as const,
          type: 'material' as const,
        },
        {
          id: '3',
          title: 'Payment reminder',
          description: 'Term 2 tuition due',
          dueDate: 'In 5 days',
          actionLabel: 'Pay',
          actionTab: 'payments' as const,
          priority: 'medium' as const,
          type: 'payment' as const,
        },
      ],
      continueLearning: {
        courseTitle: 'Pastoral Leadership',
        moduleTitle: 'Module 3: Governance',
        progressPercent: 80,
        totalLectures: 10,
        completedLectures: 8,
      },
    };

    render(
      <StudentDashboard
        data={studentData}
        greetingTimeOfDay="Good evening"
        onNavigate={handleNavigate}
      />
    );

    expect(screen.getAllByText('Pastoral Leadership').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Saturday • 5:00 PM')).toBeDefined();
    expect(screen.getByText('YOUR PROGRESS')).toBeDefined();
    expect(screen.getByText('92%')).toBeDefined();
    expect(screen.getByText('84%')).toBeDefined();
    expect(screen.getByText('88%')).toBeDefined();
    expect(screen.getByText('WHAT\'S NEXT?')).toBeDefined();
    expect(screen.getByText('CONTINUE LEARNING')).toBeDefined();
    expect(screen.getByText('80%')).toBeDefined();
  });

  it('renders TeacherDashboard with TODAY, TO REVIEW, and QUICK ACTIONS', () => {
    const handleNavigate = vi.fn();
    const teacherData = {
      greetingName: 'Pastor',
      todaySchedule: {
        className: 'School of Ministry',
        cohortName: 'Class of 2026',
        time: 'Saturday • 5:00 PM',
        studentsExpected: 12,
        studentsCheckedIn: 8,
      },
      toReview: {
        assignmentsCount: 5,
        quizzesCount: 2,
        moderationRequestsCount: 1,
      },
      atRiskCount: 1,
    };

    render(
      <TeacherDashboard
        data={teacherData}
        greetingTimeOfDay="Good evening"
        onNavigate={handleNavigate}
      />
    );

    expect(screen.getByText('TODAY')).toBeDefined();
    expect(screen.getByText('School of Ministry')).toBeDefined();
    expect(screen.getByText('12 students')).toBeDefined();
    expect(screen.getByText('8 checked in')).toBeDefined();
    expect(screen.getByText('Take Attendance')).toBeDefined();
    expect(screen.getByText('TO REVIEW')).toBeDefined();
    expect(screen.getByText('5 assignments')).toBeDefined();
    expect(screen.getByText('2 quizzes')).toBeDefined();
    expect(screen.getByText('1 moderation request')).toBeDefined();
    expect(screen.getByText('QUICK ACTIONS')).toBeDefined();
  });

  it('renders AdminDashboard with SYSTEM OVERVIEW, ATTENTION REQUIRED, and QUICK ACTIONS', () => {
    const handleNavigate = vi.fn();
    const adminData = {
      totalStudents: 42,
      attendanceRate: 91,
      outstandingTuitionFormatted: 'TT$ 4,250',
      pendingGradesCount: 7,
      attentionItems: [
        { id: '1', title: '3 payment issues', type: 'warning' as const, actionLabel: 'Review' },
        { id: '2', title: '2 attendance conflicts', type: 'warning' as const },
        { id: '3', title: '5 submissions', type: 'info' as const },
        { id: '4', title: 'Database synchronized', type: 'success' as const },
      ],
      isDatabaseSynced: true,
    };

    render(
      <AdminDashboard
        data={adminData}
        greetingTimeOfDay="Good evening"
        onNavigate={handleNavigate}
      />
    );

    expect(screen.getByText('SYSTEM OVERVIEW')).toBeDefined();
    expect(screen.getByText('42')).toBeDefined();
    expect(screen.getByText('91%')).toBeDefined();
    expect(screen.getByText('TT$ 4,250')).toBeDefined();
    expect(screen.getByText('7')).toBeDefined();
    expect(screen.getByText('ATTENTION REQUIRED')).toBeDefined();
    expect(screen.getAllByText('3 payment issues').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('2 attendance conflicts')).toBeDefined();
    expect(screen.getByText('5 submissions')).toBeDefined();
    expect(screen.getByText('Database synchronized')).toBeDefined();
    expect(screen.getByText('QUICK ACTIONS')).toBeDefined();
  });

  it('renders UpcomingCard and ProgressCard individually', () => {
    const handleView = vi.fn();
    render(
      <div>
        <UpcomingCard
          courseTitle="Hermeneutics & Exegesis"
          dateTime="Saturday • 5:00 PM"
          onViewClass={handleView}
        />
        <ProgressCard attendanceRate={95} assignmentRate={90} averageScore={92} />
      </div>
    );

    expect(screen.getByText('Hermeneutics & Exegesis')).toBeDefined();
    expect(screen.getByText('95%')).toBeDefined();
  });
});
