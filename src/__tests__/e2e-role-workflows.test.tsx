import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import request from 'supertest';
import { 
  StudentDashboard, 
  TeacherDashboard, 
  AdminDashboard, 
  WhatShouldIDoNextHero 
} from '../features/dashboard';
import { createApp } from '../server/app';
import { TabType } from '../types';


const MOCK_USERS: Record<string, any> = {
  'admin-123': {
    id: 'usr-admin-1',
    firebase_uid: 'admin-123',
    email: 'admin@hteim.edu',
    role: 'admin',
    is_active: true,
  },
  'teacher-456': {
    id: 'usr-teacher-1',
    firebase_uid: 'teacher-456',
    email: 'pastor.john@hteim.edu',
    role: 'teacher',
    is_active: true,
  },
  'student-789': {
    id: 'usr-student-1',
    firebase_uid: 'student-789',
    email: 'abigail@hteim.edu',
    role: 'student',
    is_active: true,
  },
};

function createMockSupabase() {
  return {
    from: vi.fn((table: string) => {
      const builder: any = {
        _table: table,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((col: string, val: any) => {
          builder._lastEq = { col, val };
          return builder;
        }),
        is: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn(async () => ({ data: null, error: null })),
        insert: vi.fn(async () => ({ data: null, error: null })),
        maybeSingle: vi.fn(async () => {
          if (table === 'users' && builder._lastEq?.col === 'firebase_uid') {
            const user = MOCK_USERS[builder._lastEq.val];
            return { data: user || null, error: null };
          }
          if (table === 'system_settings') {
            return { data: null, error: null };
          }
          return { data: null, error: null };
        }),
      };
      return builder;
    }),
  };
}

const mockSupabase = createMockSupabase();

// Mock server auth and external services
vi.mock('../server/services/supabaseServer', () => ({
  getServerSupabase: vi.fn(() => mockSupabase),
  isSupabaseConfigured: vi.fn(() => true),
  logAuditEvent: vi.fn(async () => ({})),
}));

vi.mock('../server/services/firebaseAuth', () => ({
  verifyIdToken: vi.fn(async (token: string) => {
    if (token === 'admin-token') {
      return { uid: 'admin-123', email: 'admin@hteim.edu', name: 'Dr. Kendell Pierre', role: 'admin' };
    }
    if (token === 'teacher-token') {
      return { uid: 'teacher-456', email: 'pastor.samuel@hteim.edu', name: 'Pastor Samuel Selkridge', role: 'teacher' };
    }
    if (token === 'student-token') {
      return { uid: 'student-789', email: 'abigail@hteim.edu', name: 'Abigail Selkridge', role: 'student' };
    }
    throw new Error('Invalid token');
  }),
}));

describe('E2E Role Workflows: Student, Teacher, Admin & WhatsApp Security', () => {
  const app = createApp();

  /* ========================================================================
   * 1. STUDENT WORKFLOW
   * ======================================================================== */
  describe('Student End-to-End Journey', () => {
    it('answers "What should I do next?" with urgent attendance warning when rate < 75%', () => {
      const handleNavigate = vi.fn();
      const studentData = {
        studentName: 'Pastor Christy Arthur',
        attendanceRate: 66, // Below 75% threshold
        assignmentRate: 85,
        averageScore: 82,
        nextClass: {
          title: 'Evangelism Practicum',
          dayTime: 'Tuesday • 7:00 PM',
          location: 'Sanctuary & Zoom',
          instructor: 'Senior Pastor',
          dateStr: 'Today',
        },
        whatsNext: [
          {
            id: 'wn-1',
            title: 'Exegesis Paper Submission',
            description: 'Due in 24 hours',
            dueDate: 'Tomorrow',
            actionLabel: 'Submit Paper',
            actionTab: 'exams' as const,
            priority: 'high' as const,
            type: 'assignment' as const,
          },
        ],
        continueLearning: {
          courseTitle: 'Evangelism Practicum',
          moduleTitle: 'Module 2: Field Evangelism',
          progressPercent: 50,
          totalLectures: 6,
          completedLectures: 3,
        },
      };

      render(
        <StudentDashboard
          data={studentData}
          greetingTimeOfDay="Good evening"
          onNavigate={handleNavigate}
        />
      );

      // Verify "WHAT SHOULD I DO NEXT?" is immediately visible
      expect(screen.getByText('WHAT SHOULD I DO NEXT?')).toBeDefined();
      expect(screen.getByText('Review Attendance Record & Contact Tutor')).toBeDefined();
      expect(screen.getByText('View Attendance')).toBeDefined();

      // Click primary CTA
      const viewAttendanceBtn = screen.getByText('View Attendance');
      fireEvent.click(viewAttendanceBtn);
      expect(handleNavigate).toHaveBeenCalledWith('attendance');
    });

    it('answers "What should I do next?" with next upcoming class when attendance is healthy', () => {
      const handleNavigate = vi.fn();
      const studentData = {
        studentName: 'Abigail Selkridge',
        attendanceRate: 95,
        assignmentRate: 92,
        averageScore: 94,
        nextClass: {
          title: 'Biblical Hermeneutics & Exegesis',
          dayTime: 'Tuesday • 7:00 PM',
          location: 'Main Sanctuary',
          instructor: 'Pastor Samuel Selkridge',
          dateStr: 'Tonight',
        },
        whatsNext: [],
        continueLearning: {
          courseTitle: 'Biblical Hermeneutics',
          moduleTitle: 'Module 1: Principles of Interpretation',
          progressPercent: 75,
          totalLectures: 8,
          completedLectures: 6,
        },
      };

      render(
        <StudentDashboard
          data={studentData}
          greetingTimeOfDay="Good evening"
          onNavigate={handleNavigate}
        />
      );

      expect(screen.getByText('WHAT SHOULD I DO NEXT?')).toBeDefined();
      expect(screen.getByText('Prepare for Biblical Hermeneutics & Exegesis')).toBeDefined();
      expect(screen.getByText('View Class Details')).toBeDefined();

      fireEvent.click(screen.getByText('View Class Details'));
      expect(handleNavigate).toHaveBeenCalledWith('schedule');
    });
  });

  /* ========================================================================
   * 2. TEACHER WORKFLOW
   * ======================================================================== */
  describe('Teacher End-to-End Journey', () => {
    it('answers "What should I do next?" with pending assignment evaluations', () => {
      const handleNavigate = vi.fn();
      const teacherData = {
        greetingName: 'Pastor Samuel',
        atRiskCount: 2,
        todaySchedule: {
          hasSession: true,
          className: 'Pastoral Leadership SOM-104',
          time: '7:00 PM - 9:00 PM',
          room: 'Sanctuary',
          cohortName: 'Class of 2026',
          studentsExpected: 28,
          studentsCheckedIn: 18,
          enrolledCount: 28,
        },
        toReview: {
          assignmentsCount: 6, // 6 pending reviews
          quizzesCount: 1,
          moderationRequestsCount: 0,
          atRiskCount: 2,
        },
        recentSubmissions: [],
      };

      render(
        <TeacherDashboard
          data={teacherData}
          greetingTimeOfDay="Good afternoon"
          onNavigate={handleNavigate}
        />
      );

      expect(screen.getByText('WHAT SHOULD I DO NEXT?')).toBeDefined();
      expect(screen.getByText('Grade 6 Pending Submissions')).toBeDefined();
      expect(screen.getByText('Grade Submissions')).toBeDefined();

      fireEvent.click(screen.getByText('Grade Submissions'));
      expect(handleNavigate).toHaveBeenCalledWith('exams');
    });

    it('answers "What should I do next?" with take roll when no pending assignments but class today', () => {
      const handleNavigate = vi.fn();
      const teacherData = {
        greetingName: 'Apostle Dr. Kendell',
        atRiskCount: 0,
        todaySchedule: {
          hasSession: true,
          className: 'Apostolic Ministry & Governance',
          time: '6:30 PM - 8:30 PM',
          room: 'Auditorium',
          cohortName: 'Class of 2026',
          studentsExpected: 30,
          studentsCheckedIn: 20,
          enrolledCount: 30,
        },
        toReview: {
          assignmentsCount: 0,
          quizzesCount: 0,
          moderationRequestsCount: 0,
          atRiskCount: 0,
        },
        recentSubmissions: [],
      };

      render(
        <TeacherDashboard
          data={teacherData}
          greetingTimeOfDay="Good evening"
          onNavigate={handleNavigate}
        />
      );

      expect(screen.getByText('WHAT SHOULD I DO NEXT?')).toBeDefined();
      expect(screen.getByText('Take Roll: Apostolic Ministry & Governance')).toBeDefined();
      const attendanceBtns = screen.getAllByText('Take Attendance');
      expect(attendanceBtns.length).toBeGreaterThanOrEqual(1);

      fireEvent.click(attendanceBtns[0]);
      expect(handleNavigate).toHaveBeenCalledWith('attendance');
    });
  });

  /* ========================================================================
   * 3. ADMIN WORKFLOW
   * ======================================================================== */
  describe('Admin End-to-End Journey', () => {
    it('answers "What should I do next?" with urgent system attention items', () => {
      const handleNavigate = vi.fn();
      const adminData = {
        totalStudents: 32,
        attendanceRate: 88,
        overallAttendance: 88,
        outstandingTuitionFormatted: 'TT$ 4,250',
        pendingGradesCount: 7,
        tuitionCollectionRate: 78,
        cloudSyncStatus: 'synced' as const,
        isDatabaseSynced: true,
        attentionItems: [
          {
            id: 'att-1',
            title: 'Past Due Balance: 3 Students Overdue',
            type: 'warning' as const,
            description: 'Send automated reminder for second semester tuition installment.',
            actionLabel: 'Review Accounts',
            actionTab: 'payments' as TabType,
            priority: 'urgent' as const,
          },
        ],
        recentActivities: [],
      };

      render(
        <AdminDashboard
          data={adminData}
          greetingTimeOfDay="Good morning"
          onNavigate={handleNavigate}
        />
      );

      expect(screen.getByText('WHAT SHOULD I DO NEXT?')).toBeDefined();
      const matched = screen.getAllByText('Past Due Balance: 3 Students Overdue');
      expect(matched.length).toBeGreaterThanOrEqual(1);
      
      const reviewButtons = screen.getAllByText('Review Accounts');
      expect(reviewButtons.length).toBeGreaterThanOrEqual(1);

      fireEvent.click(reviewButtons[0]);
      expect(handleNavigate).toHaveBeenCalledWith('payments');
    });
  });

  /* ========================================================================
   * 4. WHATSAPP & SECURITY ARCHITECTURE WORKFLOW
   * ======================================================================== */
  describe('WhatsApp Architecture & Role Authorization', () => {
    it('allows all authenticated roles to read WhatsApp group config', async () => {
      const res = await request(app)
        .get('/api/whatsapp/config')
        .set('Authorization', 'Bearer student-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.config).toBeDefined();
      expect(res.body.config.groupName).toContain('HTEIM School of Ministry');
    });

    it('blocks student role from modifying WhatsApp configuration (403 Forbidden)', async () => {
      const res = await request(app)
        .put('/api/whatsapp/config')
        .set('Authorization', 'Bearer student-token')
        .send({
          groupName: 'Hacked Group Name',
          groupInviteUrl: 'https://chat.whatsapp.com/invite/FakeLink123',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Forbidden');
    });

    it('allows administrator to update official WhatsApp group configuration', async () => {
      const res = await request(app)
        .put('/api/whatsapp/config')
        .set('Authorization', 'Bearer admin-token')
        .send({
          groupName: 'HTEIM School of Ministry - Official Class of 2026',
          groupInviteUrl: 'https://chat.whatsapp.com/invite/OfficialClassGroup2026',
          description: 'Updated official fellowship group link.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.config.groupName).toBe('HTEIM School of Ministry - Official Class of 2026');
      expect(res.body.config.groupInviteUrl).toBe('https://chat.whatsapp.com/invite/OfficialClassGroup2026');
    });

    it('generates sanitized WhatsApp broadcast preview link', async () => {
      const res = await request(app)
        .post('/api/whatsapp/broadcast-preview')
        .set('Authorization', 'Bearer teacher-token')
        .send({
          subject: 'Tuesday Lecture Zoom Credentials',
          message: 'Join us tonight at 7:00 PM EST on Zoom. Meeting ID: 842 1928 3821.',
          target: 'all_students',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.formattedText).toContain('Tuesday Lecture Zoom Credentials');
      expect(res.body.whatsappWebUrl).toContain('https://api.whatsapp.com/send?text=');
    });
  });
});
