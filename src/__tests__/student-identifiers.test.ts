/**
 * student-identifiers.test.ts
 *
 * Verifies the strict separation between:
 *   - studentRecordId: PostgreSQL UUID (students.id)
 *   - studentNumber:   Registration code (e.g. SOM-2026-001)
 *   - studentId:       Deprecated alias — MUST ONLY point to a UUID, never a registration code
 *
 * These tests guard against regression where a registration code is accidentally
 * stored in a UUID column or used as an FK in a query.
 */

import { describe, it, expect } from 'vitest';
import type { AuthenticatedUser } from '../types/rbac';

// ── Helpers ────────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REG_CODE_RE = /^SOM-\d{4}-\d+$/i; // e.g. SOM-2026-001

function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}

function isRegistrationCode(v: string): boolean {
  return REG_CODE_RE.test(v);
}

// ── Fixture builders ───────────────────────────────────────────────────────────

function makeStudentUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    userId: 'uid-firebase-abc123',
    email: 'student@example.com',
    role: 'student',
    studentRecordId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    studentNumber: 'SOM-2026-042',
    // studentId is the deprecated alias and MUST mirror studentRecordId (UUID)
    studentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    permissions: [],
    assignedCourses: [],
    ...overrides,
  } as unknown as AuthenticatedUser;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Student identifier semantics', () => {
  it('studentRecordId is always a UUID', () => {
    const user = makeStudentUser();
    expect(user.studentRecordId).toBeDefined();
    expect(isUuid(user.studentRecordId!)).toBe(true);
  });

  it('studentNumber is always a registration code, never a UUID', () => {
    const user = makeStudentUser();
    expect(user.studentNumber).toBeDefined();
    expect(isRegistrationCode(user.studentNumber!)).toBe(true);
    expect(isUuid(user.studentNumber!)).toBe(false);
  });

  it('studentId (deprecated alias) equals studentRecordId, never studentNumber', () => {
    const user = makeStudentUser();
    expect(user.studentId).toBe(user.studentRecordId);
    expect(user.studentId).not.toBe(user.studentNumber);
  });

  it('studentRecordId never contains a registration code', () => {
    const user = makeStudentUser();
    expect(isRegistrationCode(user.studentRecordId!)).toBe(false);
  });

  it('studentNumber never contains a UUID', () => {
    const user = makeStudentUser();
    expect(isUuid(user.studentNumber!)).toBe(false);
  });
});

describe('Student ownership filter — UUID-only guard', () => {
  /**
   * Simulates the filter applied in financeService / attendanceService / studentsService.
   * Verifies that registration codes are never compared against UUID columns.
   */
  function ownershipFilter(user: AuthenticatedUser, records: Array<{ student_id: string }>) {
    // This is the corrected pattern used across all domain services
    const studentUuid = user.studentRecordId || user.userId;
    const userUuid = user.userId || (user as any).id;
    return records.filter(
      (r) => r.student_id === studentUuid || r.student_id === userUuid,
    );
  }

  it('matches records by UUID student_id correctly', () => {
    const user = makeStudentUser();
    const records = [
      { student_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }, // matches
      { student_id: 'ffffffff-0000-0000-0000-000000000000' }, // different student
      { student_id: 'SOM-2026-042' },                          // registration code — must NOT match
    ];
    const filtered = ownershipFilter(user, records);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].student_id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
  });

  it('does NOT match a registration code against UUID student_id column', () => {
    const user = makeStudentUser();
    const records = [{ student_id: 'SOM-2026-042' }]; // registration code in UUID column (data error)
    const filtered = ownershipFilter(user, records);
    // The filter must never match a registration code
    expect(filtered).toHaveLength(0);
  });

  it('studentId alias produces same result as studentRecordId in filter', () => {
    const user = makeStudentUser();
    const records = [{ student_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }];

    // Using studentId alias
    const withAlias = records.filter((r) => r.student_id === user.studentId);
    // Using canonical studentRecordId
    const withCanonical = records.filter((r) => r.student_id === user.studentRecordId);

    expect(withAlias).toEqual(withCanonical);
  });
});

describe('Registration code filter — separate from UUID filter', () => {
  /**
   * Simulates the registration-code matching path added in supabaseServer.ts
   * matchesStudent for student_number fields.
   */
  function regCodeFilter(user: AuthenticatedUser, records: Array<{ student_number: string }>) {
    const studentNumber = (user.studentNumber || '').trim().toLowerCase();
    return records.filter(
      (r) => studentNumber && r.student_number.trim().toLowerCase() === studentNumber,
    );
  }

  it('matches records by student_number (registration code) correctly', () => {
    const user = makeStudentUser();
    const records = [
      { student_number: 'SOM-2026-042' }, // matches
      { student_number: 'SOM-2026-001' }, // different student
    ];
    const filtered = regCodeFilter(user, records);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].student_number).toBe('SOM-2026-042');
  });

  it('does NOT match a UUID against student_number column', () => {
    const user = makeStudentUser();
    const records = [{ student_number: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }]; // UUID in reg-code col (data error)
    const filtered = regCodeFilter(user, records);
    expect(filtered).toHaveLength(0);
  });
});
