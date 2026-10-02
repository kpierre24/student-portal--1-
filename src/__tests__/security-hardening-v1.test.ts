import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as jose from 'jose';
import { 
  authenticate, 
  requireAuth, 
  requirePermission, 
  requireResourceOwnership, 
  verifyLecturerCourseInDatabase,
  verifyStudentOwnershipInDatabase 
} from '../server/middleware/rbac';
import { verifyAuthToken } from '../server/services/supabaseTokenVerifier';
import * as supabaseServer from '../server/services/supabaseServer';
import { AuthenticatedUser } from '../types/rbac';

describe('Security Hardening v1.0 — Adversarial & Cryptographic Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Cryptographic Authentication & Token Bypass Resistance', () => {
    it('rejects forged JWT with invalid signature (→ 401)', async () => {
      const forgedJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6ImFkbWluIn0.invalid_signature_here';
      await expect(verifyAuthToken(forgedJwt)).rejects.toThrow();
    });

    it('rejects expired JWT token (→ 401)', async () => {
      const secret = new Uint8Array(Buffer.from('test-secret-at-least-32-chars-long-1234'));
      const expiredJwt = await new jose.SignJWT({ sub: 'user-123', role: 'admin' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 1800)
        .sign(secret);

      process.env.SUPABASE_JWT_SECRET = 'test-secret-at-least-32-chars-long-1234';
      await expect(verifyAuthToken(expiredJwt)).rejects.toThrow();
      delete process.env.SUPABASE_JWT_SECRET;
    });

    it('rejects unsigned JWT without signature (→ 401)', async () => {
      const unsignedJwt = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbi11c2VyIiwicm9sZSI6ImFkbWluIn0.';
      await expect(verifyAuthToken(unsignedJwt)).rejects.toThrow();
    });

    it('rejects Base64 encoded JSON session token (→ 401)', async () => {
      const base64Session = Buffer.from(JSON.stringify({ email: 'admin@som.hteim.org', role: 'admin' })).toString('base64');
      await expect(verifyAuthToken(base64Session)).rejects.toThrow();
    });

    it('rejects raw email string supplied as Bearer token (→ 401)', async () => {
      const emailToken = 'admin@som.hteim.org';
      await expect(verifyAuthToken(emailToken)).rejects.toThrow();
    });

    it('ignores x-user-email and x-user-id headers without valid Bearer token (→ 401)', async () => {
      const mockReq: any = {
        headers: {
          'x-user-email': 'admin@som.hteim.org',
          'x-user-id': 'usr_admin',
        },
        query: {},
        path: '/api/admin/system',
      };
      const mockRes: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const mockNext = vi.fn();

      await authenticate(mockReq, mockRes, mockNext);
      requireAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockReq.user).toBeUndefined();
    });

    it('rejects ?email=admin@example.com query parameter without valid Bearer token (→ 401)', async () => {
      const mockReq: any = {
        headers: {},
        query: { email: 'admin@som.hteim.org' },
        path: '/api/students',
      };
      const mockRes: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const mockNext = vi.fn();

      await authenticate(mockReq, mockRes, mockNext);
      requireAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockReq.user).toBeUndefined();
    });

    it('rejects ?userEmail=admin@example.com query parameter without valid Bearer token (→ 401)', async () => {
      const mockReq: any = {
        headers: {},
        query: { userEmail: 'admin@som.hteim.org' },
        path: '/api/payments',
      };
      const mockRes: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const mockNext = vi.fn();

      await authenticate(mockReq, mockRes, mockNext);
      requireAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockReq.user).toBeUndefined();
    });

    it('rejects forged role=admin inside unsigned or invalid token (→ 401)', async () => {
      const forgedToken = 'invalid-token-payload-claiming-admin';
      await expect(verifyAuthToken(forgedToken)).rejects.toThrow();
    });
  });

  describe('2. Authorization, Separation of Duties & Tenant Isolation', () => {
    it('blocks Student from accessing another Student record (→ 403 Forbidden)', async () => {
      const mockSupabase: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockResolvedValue({
              data: [{ id: 'rec-bob', user_id: 'user-bob-id', student_number: 'SOM-STU-002' }],
              error: null
            })
          })
        })
      };
      vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase);

      const mockReq: any = {
        user: {
          uid: 'student-alice-uid',
          userId: 'student-alice-id',
          id: 'student-alice-id',
          email: 'alice@som.hteim.org',
          name: 'Alice',
          studentRecordId: 'rec-alice',
          studentNumber: 'SOM-STU-001',
          role: 'student',
          permissions: ['assignments:submit', 'grades:read'],
        },
        params: { studentId: 'rec-bob' },
        query: {},
        body: {},
      };
      const mockRes: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const mockNext = vi.fn();

      const ownershipMiddleware = requireResourceOwnership({
        getTarget: (req) => ({ targetStudentRecordId: req.params.studentId }),
        allowedRoles: ['super_admin', 'admin', 'registrar']
      });

      await ownershipMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringMatching(/Access denied|Forbidden/i),
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('verifies Student ownership fails when targeting different student ID (→ false)', async () => {
      const mockSupabase: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockResolvedValue({
              data: [{ id: 'rec-bob-456', user_id: 'user-bob', student_number: 'SOM-002' }],
              error: null
            })
          })
        })
      };
      vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase);

      const studentUser: AuthenticatedUser = {
        uid: 'user-student-alice',
        id: 'user-student-alice',
        userId: 'user-student-alice',
        email: 'alice@student.som.org',
        name: 'Alice',
        role: 'student',
        studentRecordId: 'rec-alice-123',
        studentNumber: 'SOM-001',
        permissions: ['assignments:submit', 'grades:read'],
      };

      const isOwned = await verifyStudentOwnershipInDatabase(
        studentUser,
        'rec-bob-456',
        'Bob',
        'bob@student.som.org'
      );

      expect(isOwned).toBe(false);
    });

    it('blocks Lecturer from modifying unrelated Course Offerings (→ false)', async () => {
      const mockSupabase: any = {
        from: (table: string) => {
          if (table === 'course_definitions') {
            return {
              select: () => ({
                ilike: () => ({
                  is: () => ({
                    maybeSingle: async () => ({ data: { id: 'def-999' }, error: null })
                  })
                })
              })
            };
          }
          if (table === 'course_offerings') {
            return {
              select: () => ({
                eq: () => ({
                  or: () => ({
                    is: () => ({
                      limit: () => ({
                        maybeSingle: async () => ({ data: null, error: null })
                      })
                    })
                  })
                })
              })
            };
          }
          return {
            select: () => ({
              or: () => ({
                is: () => ({
                  maybeSingle: async () => ({ data: { id: '00000000-0000-0000-0000-000000000001' }, error: null })
                })
              })
            })
          };
        }
      };
      vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase as any);

      const lecturerUser: AuthenticatedUser = {
        uid: 'user-lecturer-anderson',
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'anderson@faculty.som.org',
        name: 'Pastor Anderson',
        role: 'lecturer',
        assignedCourses: ['SOM-101'],
        permissions: ['grades:write', 'attendance:write'],
      };

      const isAssigned = await verifyLecturerCourseInDatabase(
        lecturerUser,
        'SOM-999-UNRELATED'
      );

      expect(isAssigned).toBe(false);
    });

    it('blocks Finance Officer from accessing academic grading administration (→ 403 Forbidden)', () => {
      const mockReq: any = {
        user: {
          id: 'bursar-id',
          role: 'finance_officer',
          permissions: ['finance:read', 'finance:write', 'finance:refund'],
        },
      };
      const mockRes: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const mockNext = vi.fn();

      const gradeAdminMiddleware = requirePermission('grades:release');
      gradeAdminMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'PERMISSION_DENIED',
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
