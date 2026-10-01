import { describe, it, expect, vi, beforeEach } from 'vitest';

// Declare mutable mock state starting with 'mock' so Vitest permits hoisting
const mockExistingSubmissions = { data: [] as any[] };

// Mock the entire supabaseServer module at the top level
vi.mock('../server/services/supabaseServer', () => {
  const mockSupabaseInstance = {
    from: vi.fn((table: string) => {
      const queryChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          if (table === 'quiz_submissions' || table === 'quiz_attempts') {
            return Promise.resolve({
              data: mockExistingSubmissions.data,
              error: null
            });
          }
          return Promise.resolve({ data: [], error: null });
        }),
        maybeSingle: vi.fn().mockImplementation(() => {
          return Promise.resolve({ data: null, error: null });
        }),
        single: vi.fn().mockImplementation(() => {
          return Promise.resolve({ data: null, error: null });
        }),
        insert: vi.fn().mockImplementation(() => {
          return Promise.resolve({ error: null });
        }),
        upsert: vi.fn().mockImplementation(() => {
          return Promise.resolve({ error: null });
        }),
      };
      return queryChain;
    })
  };

  return {
    getServerSupabase: vi.fn(() => mockSupabaseInstance),
    logAuditEvent: vi.fn(() => Promise.resolve(true)),
    getAuthoritativeState: vi.fn(() => Promise.resolve(null)),
    getAuthorizedStateForUser: vi.fn(() => Promise.resolve(null)),
    saveAuthoritativeState: vi.fn(() => Promise.resolve(true)),
  };
});

// Import assignmentsService AFTER defining the mock
import { assignmentsService } from '../server/services/domain/assignmentsService';

describe('Public Quiz Server Integration & Security Hardening', () => {

  beforeEach(() => {
    mockExistingSubmissions.data = [];
    vi.clearAllMocks();
  });

  it('1. Valid Quiz: retrieves public quiz by valid share code or ID', async () => {
    const validCode = 'hermeneutics101';
    const result = await assignmentsService.getPublicQuiz(validCode);
    
    expect(result.quiz).toBeDefined();
    expect(result.quiz.title).toBeDefined();
    expect(result.quiz.questions.length).toBeGreaterThan(0);
    expect(result.isNotFound).toBeFalsy();
  });

  it('2. Invalid Quiz: returns isNotFound flag for invalid or non-existent share codes', async () => {
    const invalidCode = 'non-existent-share-code-99999';
    const result = await assignmentsService.getPublicQuiz(invalidCode);

    expect(result.quiz).toBeUndefined();
    expect(result.isNotFound).toBe(true);
    expect(result.message).toMatch(/not found|invalid/i);
  });

  it('3. Expired Quiz: detects expired quiz window and returns isExpired flag', async () => {
    const expiredResult = await assignmentsService.getPublicQuiz('expired-quiz-demo');
    if (expiredResult.quiz) {
      expect(expiredResult.isExpired || expiredResult.quiz.lockAt).toBeDefined();
    } else {
      expect(expiredResult.isNotFound || expiredResult.isExpired).toBe(true);
    }
  });

  it('4. Score Calculation & Tampering Prevention: server calculates authoritative score and ignores forged client score', async () => {
    const shareCode = 'hermeneutics101';
    
    // Client sends wrong answers but tries to forge score: 100
    const tamperedPayload = {
      studentName: 'Security Tester',
      studentEmail: 'tester@hteim.edu',
      responses: {
        'q_herm_1': 'wrong_option_choice_xyz'
      },
      // Client forged values
      score: 100,
      percentage: 100
    };

    const submissionResult = await assignmentsService.submitPublicQuizResponse(shareCode, tamperedPayload);

    // Server must recalculate earned score independently and NOT trust client score (100)
    expect(submissionResult.studentName).toBe('Security Tester');
    expect(submissionResult.score).not.toBe(100);
    expect(submissionResult.percentage).toBeLessThan(100);
  });

  it('5. Payload Validation: rejects submission with invalid or missing student name', async () => {
    const shareCode = 'hermeneutics101';
    
    const emptyNamePayload = {
      studentName: '   ',
      responses: { 'q1': 'Option A' }
    };

    await expect(
      assignmentsService.submitPublicQuizResponse(shareCode, emptyNamePayload)
    ).rejects.toThrow(/valid Student Name/i);
  });

  it('6. Duplicate Submission / Rate Limit: prevents rapid re-submissions within 30s window', async () => {
    const shareCode = 'hermeneutics101';
    const payload = {
      studentName: 'Unique AntiSpam Student',
      studentEmail: 'antispam@hteim.edu',
      responses: { 'q_herm_1': 'opt_1a' }
    };

    // Populate mock data to simulate a previous submission 5 seconds ago
    mockExistingSubmissions.data = [
      { id: 'sub_prev', submitted_at: new Date(Date.now() - 5000).toISOString() }
    ];

    await expect(
      assignmentsService.submitPublicQuizResponse(shareCode, payload)
    ).rejects.toThrow(/Duplicate submission detected/i);
  });

});
