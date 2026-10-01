import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { Server } from 'http';
import { AddressInfo } from 'net';
import { AuthenticatedUser, ROLE_DEFINITIONS } from '../types/rbac';
import * as supabaseServer from '../server/services/supabaseServer';

// Persona 1: Student A (Attacker trying to view Student B's data)
const studentAUser: AuthenticatedUser = {
  uid: 'fb-student-a-uid',
  userId: 'uuid-student-a-user',
  id: 'uuid-student-a-user',
  email: 'student.a@som.hteim.org',
  name: 'Student A Alice',
  role: 'student',
  studentRecordId: 'rec-uuid-student-a',
  studentNumber: 'SOM-STU-001',
  studentName: 'Student A Alice',
  permissions: ROLE_DEFINITIONS.student.permissions,
};

// Persona 2: Student B (Victim)
const studentBUser: AuthenticatedUser = {
  uid: 'fb-student-b-uid',
  userId: 'uuid-student-b-user',
  id: 'uuid-student-b-user',
  email: 'student.b@som.hteim.org',
  name: 'Student B Bob',
  role: 'student',
  studentRecordId: 'rec-uuid-student-b',
  studentNumber: 'SOM-STU-002',
  studentName: 'Student B Bob',
  permissions: ROLE_DEFINITIONS.student.permissions,
};

// Persona 3: Lecturer A (Assigned ONLY to SOM-101)
const lecturerAUser: AuthenticatedUser = {
  uid: 'fb-lecturer-a-uid',
  userId: 'uuid-lecturer-a-user',
  id: 'uuid-lecturer-a-user',
  email: 'lecturer.a@som.hteim.org',
  name: 'Lecturer A Anderson',
  role: 'lecturer',
  assignedCourses: ['SOM-101'],
  permissions: ROLE_DEFINITIONS.lecturer.permissions,
};

// Persona 4: Finance Officer
const financeUser: AuthenticatedUser = {
  uid: 'fb-finance-uid',
  userId: 'uuid-finance-user',
  id: 'uuid-finance-user',
  email: 'bursar@som.hteim.org',
  name: 'Bursar Financial Officer',
  role: 'finance_officer',
  permissions: ROLE_DEFINITIONS.finance_officer.permissions,
};

// Persona 5: Teacher / Faculty
const teacherUser: AuthenticatedUser = {
  uid: 'fb-teacher-uid',
  userId: 'uuid-teacher-user',
  id: 'uuid-teacher-user',
  email: 'teacher.tim@som.hteim.org',
  name: 'Teacher Tim',
  role: 'teacher',
  assignedCourses: ['SOM-101'],
  permissions: ROLE_DEFINITIONS.lecturer.permissions,
};

// Persona 6: System Administrator
const adminUser: AuthenticatedUser = {
  uid: 'fb-admin-uid',
  userId: 'uuid-admin-user',
  id: 'uuid-admin-user',
  email: 'admin@som.hteim.org',
  name: 'Dean Administrator',
  role: 'admin',
  permissions: ROLE_DEFINITIONS.admin.permissions,
};

// Mock logger
vi.mock('../lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock authenticate middleware to map tokens to personas, while keeping real authorization logic
vi.mock('../server/middleware/rbac', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    authenticate: (req: any, _res: any, next: any) => {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();

      if (token === 'student-a-token') req.user = studentAUser;
      else if (token === 'student-b-token') req.user = studentBUser;
      else if (token === 'lecturer-a-token') req.user = lecturerAUser;
      else if (token === 'finance-token') req.user = financeUser;
      else if (token === 'teacher-token') req.user = teacherUser;
      else if (token === 'admin-token') req.user = adminUser;
      // unauthenticated otherwise

      next();
    },
    verifyLecturerCourseInDatabase: async (user: any, courseCode: string) => {
      if ((user.role === 'lecturer' || user.role === 'teacher') && user.id === 'uuid-lecturer-a-user') {
        return courseCode === 'SOM-101';
      }
      return false;
    },
  };
});

// Import createApp after mocking rbac
import { createApp } from '../server/app';

describe('Adversarial API Attack Test Suite (Penetration & Authorization Hardening)', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';

    const mockSupabase: any = {
      from: vi.fn().mockImplementation((table: string) => {
        const queryChain: any = {
          _table: table,
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockImplementation((filterStr: string) => {
            if (table === 'students') {
              const all = [
                { id: 'rec-uuid-student-b', user_id: 'uuid-student-b-user', student_number: 'SOM-STU-002' },
                { id: 'rec-uuid-student-a', user_id: 'uuid-student-a-user', student_number: 'SOM-STU-001' },
              ];
              const matched = all.filter(
                (s) => filterStr && (filterStr.includes(s.id) || filterStr.includes(s.user_id) || filterStr.includes(s.student_number))
              );
              return Promise.resolve({
                data: matched,
                error: null,
              });
            }
            return queryChain;
          }),
          ilike: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockImplementation(async () => {
            if (table === 'course_definitions') {
              return { data: { id: 'course-def-som-101', code: 'SOM-101' }, error: null };
            }
            if (table === 'course_offerings') {
              return { data: null, error: null };
            }
            return { data: null, error: null };
          }),
        };
        return queryChain;
      }),
    };
    supabaseServer.setServerSupabaseClient(mockSupabase);

    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    supabaseServer.setServerSupabaseClient(null);
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  // ==========================================================================
  // Attack 1: Student A → GET Student B grades → 403
  // ==========================================================================
  describe('Attack 1: Cross-Student Grade Snooping', () => {
    it('Student A -> GET Student B grades -> 403 Forbidden', async () => {
      const response = await fetch(`${baseUrl}/api/grades?studentId=${studentBUser.studentRecordId}`, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer student-a-token',
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('RESOURCE_OWNERSHIP_DENIED');
      expect(data.error).toContain('Access Denied');
    });

    it('Student A -> GET Student B grades via targetStudentName -> 403 Forbidden', async () => {
      const response = await fetch(`${baseUrl}/api/grades?studentName=${encodeURIComponent(studentBUser.name)}`, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer student-a-token',
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('RESOURCE_OWNERSHIP_DENIED');
    });
  });

  // ==========================================================================
  // Attack 2: Student A → GET Student B finances → 403
  // ==========================================================================
  describe('Attack 2: Cross-Student Financial Ledger Snooping', () => {
    it('Student A -> GET Student B invoices -> 403 Forbidden', async () => {
      const response = await fetch(`${baseUrl}/api/invoices?studentId=${studentBUser.studentRecordId}`, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer student-a-token',
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('RESOURCE_OWNERSHIP_DENIED');
    });

    it('Student A -> GET Student B payment invoices -> 403 Forbidden', async () => {
      const response = await fetch(`${baseUrl}/api/payments/invoices?studentId=${studentBUser.studentRecordId}`, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer student-a-token',
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('RESOURCE_OWNERSHIP_DENIED');
    });

    it('Student A -> GET Student B financial-profile endpoint -> 403 Forbidden', async () => {
      const response = await fetch(`${baseUrl}/api/students/${studentBUser.studentRecordId}/financial-profile`, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer student-a-token',
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('RESOURCE_OWNERSHIP_DENIED');
    });
  });

  // ==========================================================================
  // Attack 3: Student A → modify Student B attendance → 403
  // ==========================================================================
  describe('Attack 3: Student Attendance Tampering', () => {
    it('Student A -> modify Student B attendance via POST /api/attendance -> 403 Forbidden', async () => {
      const response = await fetch(`${baseUrl}/api/attendance`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer student-a-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: studentBUser.studentRecordId,
          studentName: studentBUser.name,
          date: '2026-10-01',
          status: 'present',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('PERMISSION_DENIED');
      expect(data.userRole).toBe('student');
    });

    it('Student A -> modify attendance via PATCH /api/attendance/:id -> 403 Forbidden', async () => {
      const response = await fetch(`${baseUrl}/api/attendance/att-rec-999`, {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer student-a-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'present',
          manualOverride: true,
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('PERMISSION_DENIED');
    });

    it('Student A -> approve attendance override via POST /api/attendance/override -> 403 Forbidden', async () => {
      const response = await fetch(`${baseUrl}/api/attendance/override`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer student-a-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentName: studentBUser.name,
          date: '2026-10-01',
          overrideStatus: 'present',
          reason: 'Forged excuse note',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('PERMISSION_DENIED');
    });
  });

  // ==========================================================================
  // Attack 4: Lecturer A → modify Course B grades → 403
  // ==========================================================================
  describe('Attack 4: Cross-Course Lecturer Grade Tampering', () => {
    it('Lecturer A -> modify Course B grades via POST /api/grades -> 403 Forbidden', async () => {
      // Lecturer A is assigned to SOM-101, but attempts to grade submission for SOM-201
      const response = await fetch(`${baseUrl}/api/grades`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer lecturer-a-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId: 'sub-course-b-001',
          assignmentId: 'asg-course-b-001',
          courseCode: 'SOM-201',
          studentId: studentBUser.studentRecordId,
          score: 98,
          feedback: 'Unauthorized grade modification attempt',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('LECTURER_COURSE_UNASSIGNED');
      expect(data.error).toContain('You are not assigned as the lecturer for course SOM-201');
    });

    it('Lecturer A -> modify Course B grades via PATCH /api/grades/:id -> 403 Forbidden', async () => {
      const response = await fetch(`${baseUrl}/api/grades/sub-course-b-001`, {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer lecturer-a-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseCode: 'SOM-201',
          score: 100,
          feedback: 'Unauthorized score injection',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('LECTURER_COURSE_UNASSIGNED');
    });
  });

  // ==========================================================================
  // Attack 5: Finance user → modify academic grade → 403
  // ==========================================================================
  describe('Attack 5: Unauthorized Role Grade Manipulation (Finance User)', () => {
    it('Finance user -> modify academic grade via POST /api/grades -> 403 Forbidden', async () => {
      const response = await fetch(`${baseUrl}/api/grades`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer finance-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId: 'sub-001',
          courseCode: 'SOM-101',
          score: 95,
          feedback: 'Grade altered by bursar',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('PERMISSION_DENIED');
      expect(data.userRole).toBe('finance_officer');
    });

    it('Finance user -> modify academic grade via PATCH /api/grades/:id -> 403 Forbidden', async () => {
      const response = await fetch(`${baseUrl}/api/grades/sub-001`, {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer finance-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          score: 88,
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('PERMISSION_DENIED');
      expect(data.userRole).toBe('finance_officer');
    });
  });

  // ==========================================================================
  // Attack 6: Teacher → access financial administration → 403
  // ==========================================================================
  describe('Attack 6: Faculty Financial Administration Intrusion', () => {
    it('Teacher -> access financial invoices list via GET /api/invoices -> 403 Forbidden', async () => {
      const response = await fetch(`${baseUrl}/api/invoices`, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer teacher-token',
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('PERMISSION_DENIED');
      expect(data.userRole).toBe('teacher');
    });

    it('Teacher -> generate invoice via POST /api/invoices -> 403 Forbidden', async () => {
      const response = await fetch(`${baseUrl}/api/invoices`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer teacher-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: studentBUser.studentRecordId,
          amountDue: 500,
          dueDate: '2026-11-01',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('PERMISSION_DENIED');
    });

    it('Teacher -> record tuition payment via POST /api/payments -> 403 Forbidden', async () => {
      const response = await fetch(`${baseUrl}/api/payments`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer teacher-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: studentBUser.studentRecordId,
          amount: 500,
          paymentMethod: 'cash',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('PERMISSION_DENIED');
    });

    it('Teacher -> issue tuition refund via POST /api/payments/refunds -> 403 Forbidden', async () => {
      const response = await fetch(`${baseUrl}/api/payments/refunds`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer teacher-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refund: {
            paymentId: 'pay-001',
            amount: 250,
            reason: 'Unauthorized faculty refund disbursement',
          },
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('PERMISSION_DENIED');
    });
  });

  // ==========================================================================
  // Attack 7: Student → call admin endpoint → 403
  // ==========================================================================
  describe('Attack 7: Student Calling Administrative Endpoints', () => {
    it('Student -> inspect system audit logs via GET /api/audit-logs -> 403 Forbidden', async () => {
      const response = await fetch(`${baseUrl}/api/audit-logs`, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer student-a-token',
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('PERMISSION_DENIED');
      expect(data.userRole).toBe('student');
    });

    it('Student -> enroll new student via POST /api/students -> 403 Forbidden', async () => {
      const response = await fetch(`${baseUrl}/api/students`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer student-a-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Fake Injected Student',
          email: 'fake.student@example.test',
          level: 'Level 1 Foundation',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('PERMISSION_DENIED');
      expect(data.userRole).toBe('student');
    });

    it('Student -> alter student standing via PATCH /api/students/:id -> 403 Forbidden', async () => {
      const response = await fetch(`${baseUrl}/api/students/${studentBUser.studentRecordId}`, {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer student-a-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enrollmentStatus: 'graduated',
          level: 'Level 4 Executive',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('PERMISSION_DENIED');
      expect(data.userRole).toBe('student');
    });

    it('Student -> execute administrative grade override via POST /api/grades/override -> 403 Forbidden', async () => {
      const response = await fetch(`${baseUrl}/api/grades/override`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer student-a-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId: 'sub-001',
          score: 100,
          reason: 'Forged administrative grade override',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('PERMISSION_DENIED');
    });
  });

  // ==========================================================================
  // Edge Case: Unauthenticated Request -> 401 Unauthorized
  // ==========================================================================
  describe('Edge Attack: Unauthenticated Request', () => {
    it('No credentials -> GET /api/grades -> 401 Unauthorized', async () => {
      const response = await fetch(`${baseUrl}/api/grades`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('UNAUTHENTICATED');
    });
  });
});
