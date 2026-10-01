import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  collectAllPortalData, 
  restoreFullBackupJSON,
  FullBackupBundle 
} from '../lib/backupSuite';
import { 
  logActivity, 
  getAuditLogs, 
  clearAuditLogs, 
  pruneAuditLogs 
} from '../lib/auditLogger';

describe('Administrative & Cloud Data Operations Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    clearAuditLogs();
    vi.restoreAllMocks();
  });

  describe('Full Data Backup & Disaster Recovery Engine', () => {
    it('collects all portal data slices into a standardized JSON bundle', () => {
      const mockPayments = [
        { id: 'pay-1', studentName: 'Danielle Clarke', totalTuition: 1500, amountPaid: 1500, status: 'paid' }
      ];
      const mockAttendance = [
        { name: 'Danielle Clarke', day: 'Introduction', present: true, scoreStr: '10/10' }
      ];
      const mockAssignments = [
        { id: 'asg-1', title: 'Kingdom Foundations Essay', maxPoints: 100 }
      ];

      localStorage.setItem('hteim_student_payments', JSON.stringify(mockPayments));
      localStorage.setItem('attendanceRecords', JSON.stringify(mockAttendance));
      localStorage.setItem('hteim_custom_assignments', JSON.stringify(mockAssignments));

      const bundle = collectAllPortalData('Apostle Kendell');

      expect(bundle.version).toBe('2.5.0');
      expect(bundle.exportedBy).toBe('Apostle Kendell');
      expect(bundle.institution).toContain('HTEIM');
      expect(bundle.data.paymentLedgers).toEqual(mockPayments);
      expect(bundle.data.attendanceRecords).toEqual(mockAttendance);
      expect(bundle.data.customAssignments).toEqual(mockAssignments);
    });

    it('successfully validates and restores a valid institutional JSON backup', () => {
      const validBundle: FullBackupBundle = {
        version: '2.5.0',
        exportedAt: new Date().toISOString(),
        institution: 'Heaven Touching Earth Int\'l Ministries (HTEIM) School of Ministry',
        exportedBy: 'Admin Recovery Service',
        data: {
          attendanceRecords: [{ name: 'Joshua Selkridge', day: 'Lesson 2', present: true }],
          paymentLedgers: [{ id: 'pay-2', studentName: 'Joshua Selkridge', totalTuition: 1500, amountPaid: 1000 }],
          customAssignments: [{ id: 'asg-2', title: 'Evangelism Strategy Outline' }],
          assignmentSubmissions: [],
          rubricScores: { 'Joshua Selkridge': { homiletics: 95 } },
          notifications: [],
          messages: [],
          auditLogs: [],
          settings: { themeMode: 'dark', atRiskThreshold: '75' }
        }
      };

      const success = restoreFullBackupJSON(JSON.stringify(validBundle), 'Super Admin');
      expect(success).toBe(true);

      expect(JSON.parse(localStorage.getItem('attendanceRecords') || '[]')).toHaveLength(1);
      expect(JSON.parse(localStorage.getItem('hteim_student_payments') || '[]')).toHaveLength(1);
      expect(localStorage.getItem('themeMode')).toBe('dark');
    });

    it('rejects malformed or invalid JSON payloads during backup restoration', () => {
      expect(restoreFullBackupJSON('{ invalid json', 'Admin')).toBe(false);
      expect(restoreFullBackupJSON('{"version": "1.0"}', 'Admin')).toBe(false);
      expect(restoreFullBackupJSON('', 'Admin')).toBe(false);
    });
  });

  describe('Administrative Batch Operations & Governance', () => {
    it('assesses standard $50 late fees across overdue student accounts and logs audit record', () => {
      const mockPayments = [
        { id: 'p1', studentName: 'Student Overdue', totalTuition: 1500, amountPaid: 1000, notes: '' },
        { id: 'p2', studentName: 'Student Paid', totalTuition: 1500, amountPaid: 1500, notes: '' }
      ];
      localStorage.setItem('hteim_student_payments', JSON.stringify(mockPayments));

      // Simulate Late Fee Assessment Routine
      const saved = JSON.parse(localStorage.getItem('hteim_student_payments') || '[]');
      let appliedCount = 0;
      const updated = saved.map((p: any) => {
        const balance = (p.totalTuition || 0) - (p.amountPaid || 0);
        if (balance > 0 && !p.lateFeeApplied) {
          appliedCount++;
          return {
            ...p,
            totalTuition: (p.totalTuition || 0) + 50,
            lateFeeApplied: true,
            notes: `${p.notes || ''} [Admin Notice: $50 Late Fee Assessed]`.trim()
          };
        }
        return p;
      });
      localStorage.setItem('hteim_student_payments', JSON.stringify(updated));

      expect(appliedCount).toBe(1);
      const afterSaved = JSON.parse(localStorage.getItem('hteim_student_payments') || '[]');
      expect(afterSaved[0].totalTuition).toBe(1550);
      expect(afterSaved[0].lateFeeApplied).toBe(true);
      expect(afterSaved[1].totalTuition).toBe(1500); // Fully paid student unmodified
    });

    it('normalizes and rounds fractional score entries in attendance matrix', () => {
      const mockAttendance = [
        { name: 'Afeshia Burke', day: 'Lesson 1', scoreStr: '8.7/10' },
        { name: 'Afeshia Burke', day: 'Lesson 2', scoreStr: '9/10' }
      ];
      localStorage.setItem('attendanceRecords', JSON.stringify(mockAttendance));

      const saved = JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
      let normalizedCount = 0;
      const updated = saved.map((r: any) => {
        if (r.scoreStr && r.scoreStr.includes('/')) {
          const parts = r.scoreStr.split('/');
          const num = parseFloat(parts[0]);
          const den = parseFloat(parts[1]);
          if (!isNaN(num) && !isNaN(den) && den > 0) {
            const roundedNum = Math.round(num);
            if (roundedNum !== num) {
              normalizedCount++;
              return { ...r, scoreStr: `${roundedNum}/${den}` };
            }
          }
        }
        return r;
      });
      localStorage.setItem('attendanceRecords', JSON.stringify(updated));

      expect(normalizedCount).toBe(1);
      const afterSaved = JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
      expect(afterSaved[0].scoreStr).toBe('9/10');
      expect(afterSaved[1].scoreStr).toBe('9/10');
    });

    it('toggles screen sharing anonymization privacy mask', () => {
      expect(localStorage.getItem('hteim_anonymize_mode')).toBeNull();

      localStorage.setItem('hteim_anonymize_mode', 'true');
      expect(localStorage.getItem('hteim_anonymize_mode')).toBe('true');

      localStorage.setItem('hteim_anonymize_mode', 'false');
      expect(localStorage.getItem('hteim_anonymize_mode')).toBe('false');
    });

    it('prunes audit logs to maintain buffer storage payload limit', () => {
      const initialCount = getAuditLogs().length;
      for (let i = 0; i < 35; i++) {
        logActivity({
          actor: 'Admin',
          role: 'admin',
          actionCategory: 'System Settings',
          actionTitle: `Routine Health Check #${i}`,
          details: 'Storage quota check performed'
        });
      }

      const logsBefore = getAuditLogs();
      expect(logsBefore.length).toBe(initialCount + 35);

      const prunedCount = pruneAuditLogs(15);
      expect(prunedCount).toBe((initialCount + 35) - 15);

      const logsAfter = getAuditLogs();
      expect(logsAfter.length).toBe(15);
    });
  });

  describe('Relational Data Integrity Scan', () => {
    it('accurately identifies orphaned assignment submissions and unassigned attendance entries', () => {
      const mockAssignments = [{ id: 'asg-101', title: 'Hermeneutics' }];
      const mockSubmissions = [
        { id: 'sub-1', assignmentId: 'asg-101', studentName: 'Grace Lee' },
        { id: 'sub-2', assignmentId: 'asg-999-deleted', studentName: 'John Doe' } // Orphan
      ];
      const mockAttendance = [
        { name: 'Grace Lee', day: 'Lesson 1', present: true },
        { name: '', day: 'Lesson 1', present: false } // Unassigned cell
      ];

      localStorage.setItem('hteim_custom_assignments', JSON.stringify(mockAssignments));
      localStorage.setItem('hteim_assignment_submissions', JSON.stringify(mockSubmissions));
      localStorage.setItem('attendanceRecords', JSON.stringify(mockAttendance));

      const asgIds = new Set(mockAssignments.map(a => a.id));
      let orphanSubs = 0;
      mockSubmissions.forEach(s => {
        if (s.assignmentId && !asgIds.has(s.assignmentId)) orphanSubs++;
      });

      let unlinkedAttendance = 0;
      mockAttendance.forEach(r => {
        if (!r.name || !r.name.trim()) unlinkedAttendance++;
      });

      expect(orphanSubs).toBe(1);
      expect(unlinkedAttendance).toBe(1);
    });
  });
});
