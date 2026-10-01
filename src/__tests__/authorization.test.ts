import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission, resolveUserFromRequest } from '../server/middleware/rbac';
import { financeService } from '../server/services/domain/financeService';
import * as supabaseServer from '../server/services/supabaseServer';
import * as firebaseAuth from '../server/services/firebaseAuth';
import { AuthenticatedUser } from '../types/rbac';

// Mock the external logger to prevent polluting test output
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function createMockSupabase(overrides?: {
  invoices?: any[];
  invoiceLines?: any[];
  paymentAllocations?: any[];
  refundAllocations?: any[];
  adjustments?: any[];
  rpcHandler?: (fnName: string, args: any) => any;
}) {
  const chainObj: any = {};
  chainObj.from = vi.fn().mockImplementation((table: string) => {
    chainObj._currentTable = table;
    return chainObj;
  });
  chainObj.select = vi.fn().mockReturnValue(chainObj);
  chainObj.eq = vi.fn().mockReturnValue(chainObj);
  chainObj.or = vi.fn().mockReturnValue(chainObj);
  chainObj.is = vi.fn().mockReturnValue(chainObj);
  chainObj.in = vi.fn().mockReturnValue(chainObj);
  chainObj.ilike = vi.fn().mockReturnValue(chainObj);
  chainObj.order = vi.fn().mockReturnValue(chainObj);
  chainObj.limit = vi.fn().mockReturnValue(chainObj);
  
  chainObj.maybeSingle = vi.fn().mockImplementation(async () => {
    let data: any = null;
    if (chainObj._currentTable === 'invoices') {
      data = overrides?.invoices?.[0] || { id: 'mock-invoice-id', due_date: '2026-12-31', status: 'unpaid' };
    }
    return { data, error: null };
  });

  chainObj.then = (onfulfilled: any) => {
    let data: any[] = [];
    if (chainObj._currentTable === 'invoices') {
      data = overrides?.invoices || [{ id: 'mock-invoice-id', student_id: 'student-rec-123', student_name: 'John Doe', invoice_number: 'INV-1' }];
    } else if (chainObj._currentTable === 'invoice_lines') {
      data = overrides?.invoiceLines || [{ total_amount: 1000 }];
    } else if (chainObj._currentTable === 'payment_allocations') {
      data = overrides?.paymentAllocations || [];
    } else if (chainObj._currentTable === 'refund_allocations') {
      data = overrides?.refundAllocations || [];
    } else if (chainObj._currentTable === 'adjustments') {
      data = overrides?.adjustments || [];
    }
    return Promise.resolve({ data, error: null }).then(onfulfilled);
  };

  chainObj.rpc = vi.fn().mockImplementation(async (fnName: string, args: any) => {
    if (overrides?.rpcHandler) {
      return overrides.rpcHandler(fnName, args);
    }
    if (fnName === 'get_next_document_number') {
      return { data: 'MOCK-DOC-001', error: null };
    }
    return { data: 'OK', error: null };
  });

  return chainObj;
}

describe('Authorization & Security Test Suite', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let statusSpy: any;
  let jsonSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    statusSpy = vi.fn().mockReturnThis();
    jsonSpy = vi.fn().mockReturnThis();

    mockReq = {
      headers: {},
      query: {},
      body: {},
      socket: { remoteAddress: '127.0.0.1' } as any,
    };

    mockRes = {
      status: statusSpy,
      json: jsonSpy,
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Scenario 1: Unauthenticated request → 401
  describe('Scenario 1: Unauthenticated request', () => {
    it('should return 401 when req.user is undefined', () => {
      mockReq.user = undefined;
      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy.mock.calls[0][0]).toMatchObject({
        code: 'UNAUTHENTICATED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // Scenario 2: Student accessing another student's invoice → 403/filtered
  describe("Scenario 2: Student accessing another student's invoice", () => {
    it('should filter invoices such that a student can only retrieve their own invoice records', async () => {
      const studentUser: AuthenticatedUser = {
        uid: 'student-uid-123',
        userId: 'student-id-123',
        id: 'student-id-123',
        email: 'student@hteim.edu',
        name: 'John Doe',
        role: 'student',
        studentId: 'student-rec-123',
        studentRecordId: 'student-rec-123',
        studentNumber: 'ST-1001',
        permissions: ['finance:read'],
      };

      const mockInvoices = [
        { id: 'inv-1', student_id: 'student-rec-123', student_name: 'John Doe', invoice_number: 'INV-1' },
        { id: 'inv-2', student_id: 'student-rec-456', student_name: 'Jane Smith', invoice_number: 'INV-2' },
      ];

      const mockSupabase = createMockSupabase({ invoices: mockInvoices });
      vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase as any);

      const result = await financeService.getInvoices({}, studentUser);

      // Assert student_rec-456 (Jane Smith's invoice) was filtered out
      expect(result.invoices).toHaveLength(1);
      expect(result.invoices[0].id).toBe('inv-1');
      expect(result.invoices[0].studentId).toBe('student-rec-123');
    });
  });

  // Scenario 3: Student creating payment → 403
  describe('Scenario 3: Student creating payment', () => {
    it('should reject payment creation with 403 due to insufficient permissions', () => {
      mockReq.user = {
        uid: 'student-uid-123',
        userId: 'student-id-123',
        id: 'student-id-123',
        email: 'student@hteim.edu',
        name: 'John Doe',
        role: 'student',
        permissions: ['finance:read'],
      };

      const middleware = requirePermission('finance:write');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy.mock.calls[0][0]).toMatchObject({
        code: 'PERMISSION_DENIED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // Scenario 4: Lecturer changing financial data → 403
  describe('Scenario 4: Lecturer changing financial data', () => {
    it('should reject lecturer modifying financial data with 403 due to insufficient permissions', () => {
      mockReq.user = {
        uid: 'lecturer-uid-123',
        userId: 'lecturer-id-123',
        id: 'lecturer-id-123',
        email: 'lecturer@hteim.edu',
        name: 'Prof. Mark',
        role: 'lecturer',
        permissions: ['students:read', 'attendance:write', 'grades:write'],
      };

      const middleware = requirePermission('finance:write');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy.mock.calls[0][0]).toMatchObject({
        code: 'PERMISSION_DENIED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // Scenario 5: Finance officer changing student role → 403
  describe('Scenario 5: Finance officer changing student role', () => {
    it('should reject finance officer changing a user role with 403', () => {
      mockReq.user = {
        uid: 'finance-uid-123',
        userId: 'finance-id-123',
        id: 'finance-id-123',
        email: 'finance@hteim.edu',
        name: 'Sarah Finance',
        role: 'finance_officer',
        permissions: ['students:read', 'finance:read', 'finance:write'],
      };

      const middleware = requirePermission('roles:manage');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy.mock.calls[0][0]).toMatchObject({
        code: 'PERMISSION_DENIED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // Scenario 6: Inactive user → 401
  describe('Scenario 6: Inactive user', () => {
    it('should reject inactive users from establishing identity resulting in 401 requireAuth', async () => {
      mockReq.headers!.authorization = 'Bearer valid-token-but-inactive';

      // Mock verifyIdToken to succeed
      vi.spyOn(firebaseAuth, 'verifyIdToken').mockResolvedValue({
        uid: 'inactive-uid-123',
        email: 'inactive@hteim.edu',
        name: 'Inactive User',
      });

      // Mock DB query to return inactive user record
      const mockSupabase = createMockSupabase({
        invoices: [{ id: 'inactive-id-123', email: 'inactive@hteim.edu', role: 'student', is_active: false }]
      });

      // Mock maybeSingle for user query to return inactive
      mockSupabase.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'inactive-id-123', email: 'inactive@hteim.edu', role: 'student', is_active: false },
        error: null,
      });

      vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase as any);

      const user = await resolveUserFromRequest(mockReq as Request);
      expect(user).toBeNull(); // Rejected
    });
  });

  // Scenario 7: Invalid Firebase token → 401
  describe('Scenario 7: Invalid Firebase token', () => {
    it('should fail authentication and return null when token is invalid or expired', async () => {
      mockReq.headers!.authorization = 'Bearer invalid-expired-token';

      // Mock verifyIdToken to fail/throw
      vi.spyOn(firebaseAuth, 'verifyIdToken').mockRejectedValue(new Error('Token expired'));

      const user = await resolveUserFromRequest(mockReq as Request);
      expect(user).toBeNull();
    });
  });

  // Scenario 8: Tampered financial totals → ignored/rejected
  describe('Scenario 8: Tampered financial totals', () => {
    it('should strip and ignore client-submitted financial totals, calculating values solely from database inputs', async () => {
      const tamperedInvoice = {
        id: '88888888-8888-4888-a888-888888888888',
        studentId: 'student-rec-123',
        studentName: 'John Doe',
        totalTuition: 99999, // Tampered
        amountPaid: 88888,   // Tampered
        balance: 0,          // Tampered
        lines: [
          { description: 'Tuition Year 1', quantity: 1, unit_amount: 1200 },
        ],
      };

      const mockSupabase = createMockSupabase();
      vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase as any);

      const result = await financeService.saveInvoice(tamperedInvoice, 'actor-123', 'admin');

      // Assert output contains invoice, and the ignored values were omitted from direct mapping
      expect(result.status).toBe('saved');
      expect(result.invoice.totalTuition).not.toBe(99999);
      expect(result.invoice.totalTuition).toBe(1000); // 1000 from the mock database line items
      expect(result.invoice.amountPaid).not.toBe(88888);
      expect(result.invoice.amountPaid).toBe(0); // Calculated dynamically from zero allocations
    });
  });

  // Scenario 9: Negative payment → rejected
  describe('Scenario 9: Negative payment', () => {
    it('should reject payments where amount is less than or equal to zero', async () => {
      const negativePayment = {
        studentId: 'student-rec-123',
        studentName: 'John Doe',
        amount: -150, // Negative
      };

      await expect(
        financeService.recordPayment(negativePayment, 'actor-123', 'finance_officer')
      ).rejects.toThrow('Payment amount must be greater than zero');
    });

    it('should reject payments where amount is zero', async () => {
      const zeroPayment = {
        studentId: 'student-rec-123',
        studentName: 'John Doe',
        amount: 0,
      };

      await expect(
        financeService.recordPayment(zeroPayment, 'actor-123', 'finance_officer')
      ).rejects.toThrow('Payment amount must be greater than zero');
    });
  });

  // Scenario 10: Duplicate transaction → rejected
  describe('Scenario 10: Duplicate transaction', () => {
    it('should reject inserting a payment transaction with a duplicate reference', async () => {
      const paymentInput = {
        studentId: 'student-rec-123',
        studentName: 'John Doe',
        amount: 500,
        transactionReference: 'TXN-DUP-999',
      };

      const mockSupabase = createMockSupabase({
        rpcHandler: (fnName: string, args: any) => {
          if (fnName === 'create_payment_transaction') {
            return {
              data: null,
              error: { message: 'duplicate key value violates unique constraint "payments_transaction_reference_key"' }
            };
          }
          if (fnName === 'get_next_document_number') {
            return { data: 'PAY-2026-000002', error: null };
          }
          return { data: 'OK', error: null };
        }
      });

      vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase as any);

      await expect(
        financeService.recordPayment(paymentInput, 'actor-123', 'finance_officer')
      ).rejects.toThrow('duplicate key value violates unique constraint');
    });
  });

  // Scenario 12: Student cannot create or approve a refund
  describe('Scenario 12: Student creating or approving refunds', () => {
    it('should reject a student trying to access refund write operations', () => {
      mockReq.user = {
        uid: 'student-uuid-456',
        id: 'student-uuid-456',
        name: 'Test Student',
        permissions: [],
        userId: 'student-uuid-456',
        role: 'student',
        email: 'student@example.com',
      };

      const middleware = requirePermission(['finance:write', 'all:access']);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy.mock.calls[0][0]).toMatchObject({
        code: 'PERMISSION_DENIED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // Scenario 13: Lecturer cannot access an unassigned course
  describe('Scenario 13: Lecturer grading unassigned course', () => {
    it('should reject a lecturer grading a course they are not assigned to', async () => {
      const { assignmentsService } = await import('../server/services/domain/assignmentsService');
      const rbacModule = await import('../server/middleware/rbac');
      
      // Mock the DB check to return false (not assigned)
      vi.spyOn(rbacModule, 'verifyLecturerCourseInDatabase').mockResolvedValue(false);

      const gradingInput = {
        submissionId: 'sub-123',
        assignmentId: 'assign-456',
        studentId: 'std-789',
        score: 95
      };

      const actorUser: AuthenticatedUser = {
        uid: 'lecturer-uuid',
        id: 'lecturer-uuid',
        name: 'Test Lecturer',
        permissions: [],
        userId: 'lecturer-uuid',
        role: 'lecturer',
        email: 'lecturer@example.com',
      };

      // Mock assignmentsService internals to bypass the initial assignment lookup and just hit the lecturer check
      const mockSupabase = createMockSupabase();
      mockSupabase.maybeSingle = vi.fn().mockResolvedValue({
        data: { 
          id: 'sub-123', 
          assignments: { id: 'assign-456', course_code: 'SOM-101', max_points: 100 }
        },
        error: null
      });
      vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase as any);

      await expect(
        assignmentsService.gradeSubmission(gradingInput, actorUser)
      ).rejects.toThrow(/Access Denied: You are not assigned as the lecturer/);
    });
  });

  // Scenario 14: User cannot access another student's attendance
  describe('Scenario 14: Student accessing another student attendance', () => {
    it('should filter attendance sessions so a student only sees their own records', async () => {
      const { attendanceService } = await import('../server/services/domain/attendanceService');
      
      const mockSupabase = createMockSupabase();
      // Override the attendance service's query to return records for multiple students
      // getAttendance queries 'attendance_records'
      mockSupabase.then = (onfulfilled: any) => {
        const data = [
          {
            id: 'rec-1',
            session_id: 'session-1',
            student_id: 'my-student-id',
            status: 'PRESENT',
            attendance_sessions: { session_date: '2026-09-01', title: 'Session 1' },
            students: { id: 'my-student-id' }
          },
          {
            id: 'rec-2',
            session_id: 'session-1',
            student_id: 'other-student-id',
            status: 'ABSENT',
            attendance_sessions: { session_date: '2026-09-01', title: 'Session 1' },
            students: { id: 'other-student-id' }
          }
        ];
        return Promise.resolve({ data, error: null }).then(onfulfilled);
      };
      
      vi.spyOn(supabaseServer, 'getServerSupabase').mockReturnValue(mockSupabase as any);

      const actorUser: AuthenticatedUser = {
        uid: 'my-student-id',
        id: 'my-student-id',
        name: 'My Student',
        permissions: [],
        userId: 'my-student-id',
        studentId: 'my-student-id',
        role: 'student',
        email: 'student@example.com',
      };

      const result = await attendanceService.getAttendance(actorUser);
      
      // Ensure only 'my-student-id' records are kept in the returned records array
      const myRecords = result.records;
      expect(myRecords).toHaveLength(1);
      expect(myRecords[0].studentId).toBe('my-student-id');
    });
  });

  // Scenario 15: User cannot submit a payment for another student
  describe('Scenario 15: Student attempting to submit a payment', () => {
    it('should block a student from using the finance transaction write endpoints', () => {
      mockReq.user = {
        uid: 'student-uuid',
        id: 'student-uuid',
        name: 'Test Student',
        permissions: [],
        userId: 'student-uuid',
        studentId: 'student-uuid',
        role: 'student',
        email: 'student@example.com',
      };
      mockReq.body = {
        payment: { studentId: 'another-student-uuid', amount: 500 }
      };

      // The payments route uses finance:write, all:access for transactions
      const middleware = requirePermission(['finance:write', 'all:access']);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy.mock.calls[0][0]).toMatchObject({
        code: 'PERMISSION_DENIED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // Scenario 16: Finance user cannot modify system administration settings
  describe('Scenario 16: Finance user modifying settings', () => {
    it('should reject a finance_officer trying to access settings write operations', () => {
      mockReq.user = {
        uid: 'finance-uuid',
        id: 'finance-uuid',
        name: 'Test Finance',
        permissions: [],
        userId: 'finance-uuid',
        role: 'finance_officer',
        email: 'finance@example.com',
      };

      const middleware = requirePermission(['all:access', 'roles:manage']);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy.mock.calls[0][0]).toMatchObject({
        code: 'PERMISSION_DENIED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
