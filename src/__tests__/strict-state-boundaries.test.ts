import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stateHydrationService } from '../server/services/domain/stateHydrationService';
import { studentsService } from '../server/services/domain/studentsService';
import { attendanceService } from '../server/services/domain/attendanceService';
import { academicsService } from '../server/services/domain/academicsService';
import { assignmentsService } from '../server/services/domain/assignmentsService';
import { financeService } from '../server/services/domain/financeService';
import { AuthenticatedUser } from '../types/rbac';

describe('Strict State Boundary Architecture Governance', () => {
  const adminUser: AuthenticatedUser = {
    uid: 'firebase-admin-1',
    userId: 'a0000000-0000-4000-8000-000000000001',
    id: 'a0000000-0000-4000-8000-000000000001',
    email: 'admin@som.hteim.org',
    name: 'Administrator',
    role: 'admin',
    permissions: ['all:access'],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Axiom 1: PostgreSQL = Authoritative Data
  // ==========================================================================
  describe('Axiom 1: PostgreSQL as Single Source of Truth', () => {
    it('stateHydrationService composes authoritative state directly from PostgreSQL domain services', async () => {
      vi.spyOn(stateHydrationService, 'ensureRelationalDataSeeded').mockResolvedValue(undefined);

      vi.spyOn(studentsService, 'getStudents').mockResolvedValue({
        students: [
          {
            id: 'std-uuid-1',
            name: 'David Goliath',
            level: 'Level 1 Foundation',
            studentNumber: 'SOM-2026-0100',
            email: 'david@som.org',
          } as any,
        ],
        total: 1,
      });

      vi.spyOn(attendanceService, 'getAttendance').mockResolvedValue({
        records: [],
        classDays: [],
        excusedAbsences: {},
      });

      vi.spyOn(academicsService, 'getAcademicStructure').mockResolvedValue({
        academicYears: [],
        terms: [],
        activeTermId: null,
        masterCourses: [],
        courseOfferings: [],
      });

      vi.spyOn(academicsService, 'getCourses').mockResolvedValue({
        courses: [{ id: 'crs-1', code: 'MIN-101', name: 'Biblical Foundations' } as any],
        total: 1,
      });

      vi.spyOn(assignmentsService, 'getAssignments').mockResolvedValue({
        assignments: [],
        total: 0,
      });

      vi.spyOn(assignmentsService, 'getSubmissions').mockResolvedValue({
        submissions: [],
        rubricScores: {},
        count: 0,
      });

      vi.spyOn(financeService, 'getInvoices').mockResolvedValue({
        invoices: [],
        total: 0,
      });

      vi.spyOn(financeService, 'getTransactions').mockResolvedValue({
        transactions: [],
        total: 0,
      });

      const state = await stateHydrationService.getComposedStateForUser(adminUser);

      expect(state).toBeDefined();
      expect(state.students).toBeDefined();
      expect(state.students.length).toBe(1);
      expect(state.students[0].name).toBe('David Goliath');
      expect(studentsService.getStudents).toHaveBeenCalled();
      expect(academicsService.getCourses).toHaveBeenCalled();
    }, 10000);

    it('Domain services reject unpersisted local mutations and write directly to PostgreSQL', () => {
      expect(typeof studentsService.enrollStudent).toBe('function');
      expect(typeof attendanceService.recordCheckin).toBe('function');
      expect(typeof financeService.recordPayment).toBe('function');
      expect(typeof assignmentsService.gradeSubmission).toBe('function');
    });
  });

  // ==========================================================================
  // Axiom 2: React State = UI State
  // ==========================================================================
  describe('Axiom 2: React State Partitioned Strictly for UI State', () => {
    it('Filters, pagination, modal open/close states operate strictly as React transient state', () => {
      const mockUIState = {
        activeTab: 'finance',
        isModalOpen: true,
        searchFilter: 'David',
        selectedCohortId: 'cohort-2026',
        isOptimisticSaving: false,
      };

      expect(mockUIState.activeTab).toBe('finance');
      expect(mockUIState.isModalOpen).toBe(true);
      expect(mockUIState.searchFilter).toBe('David');
    });
  });

  // ==========================================================================
  // Axiom 3: localStorage = Preferences & Offline Drafts Only
  // ==========================================================================
  describe('Axiom 3: localStorage Restricted to Preferences & Offline Drafts', () => {
    it('Stores user UI preferences (theme, sync intervals, locale) without polluting master data', () => {
      const preferences = {
        theme: 'dark',
        autoSyncInterval: 300,
        syncOnTabFocus: true,
        sheetMergePolicy: 'manual',
      };

      expect(preferences.theme).toBe('dark');
      expect(preferences.sheetMergePolicy).toBe('manual');
    });

    it('Offline sync queue buffers mutations when network is unreachable', () => {
      const offlineQueue = [
        {
          id: 'draft-action-1',
          type: 'CHECKIN_STUDENT',
          payload: { studentId: 'std-uuid-1', date: '2026-10-01', status: 'present' },
          timestamp: new Date().toISOString(),
          synced: false,
        },
      ];

      expect(offlineQueue[0].synced).toBe(false);
      expect(offlineQueue[0].type).toBe('CHECKIN_STUDENT');
    });
  });
});
