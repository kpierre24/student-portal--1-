import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Database Row Level Security (RLS) Intentional Strategy Audit', () => {
  const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20260911000000_comprehensive_database_rls_audit.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

  const sensitiveTables = [
    'students',
    'grades',
    'attendance',
    'assignments',
    'submissions',
    'payments',
    'invoices',
    'financial_adjustments',
    'refunds',
    'notifications',
    'audit_history'
  ];

  it('enforces Row Level Security (ENABLE ROW LEVEL SECURITY) on all 11 sensitive tables', () => {
    sensitiveTables.forEach((table) => {
      const regex = new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i');
      expect(
        regex.test(migrationSql),
        `Table public.${table} must have ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`
      ).toBe(true);
    });
  });

  describe('Table 1: students RLS Strategy', () => {
    it('defines distinct SELECT, INSERT, UPDATE, and DELETE policies', () => {
      expect(migrationSql).toContain('CREATE POLICY "students_select_policy" ON public.students');
      expect(migrationSql).toContain('CREATE POLICY "students_insert_policy" ON public.students');
      expect(migrationSql).toContain('CREATE POLICY "students_update_policy" ON public.students');
      expect(migrationSql).toContain('CREATE POLICY "students_delete_policy" ON public.students');
    });

    it('enforces student self-view isolation (user_id = auth.uid())', () => {
      expect(migrationSql).toMatch(/students_select_policy[\s\S]*?user_id\s*=\s*auth\.uid\(\)/);
    });

    it('restricts student registration to admins and registrars', () => {
      expect(migrationSql).toMatch(/students_insert_policy[\s\S]*?is_admin[\s\S]*?registrar/);
    });
  });

  describe('Table 2: grades RLS Strategy', () => {
    it('restricts grade viewing to faculty or student on their own submission', () => {
      expect(migrationSql).toContain('CREATE POLICY "grades_select_policy" ON public.grades');
      expect(migrationSql).toMatch(/grades_select_policy[\s\S]*?EXISTS\s*\(\s*SELECT 1 FROM public\.submissions/);
    });

    it('strictly prohibits students from inserting or modifying grades', () => {
      expect(migrationSql).toMatch(/grades_insert_policy[\s\S]*?public\.get_auth_user_role\(\)\s*!=\s*'student'/);
      expect(migrationSql).toMatch(/grades_update_policy[\s\S]*?public\.get_auth_user_role\(\)\s*!=\s*'student'/);
    });
  });

  describe('Table 3: attendance RLS Strategy', () => {
    it('restricts student view to their own attendance records', () => {
      expect(migrationSql).toContain('CREATE POLICY "attendance_select_policy" ON public.attendance');
      expect(migrationSql).toMatch(/attendance_select_policy[\s\S]*?student_id\s*=\s*public\.get_current_student_id\(\)/);
    });

    it('prohibits students from logging or altering attendance check-ins', () => {
      expect(migrationSql).toMatch(/attendance_insert_policy[\s\S]*?public\.get_auth_user_role\(\)\s*!=\s*'student'/);
      expect(migrationSql).toMatch(/attendance_update_policy[\s\S]*?public\.get_auth_user_role\(\)\s*!=\s*'student'/);
    });

    it('enforces RLS on secondary attendance_records and attendance_sessions tables', () => {
      expect(migrationSql).toContain('public.attendance_sessions ENABLE ROW LEVEL SECURITY');
      expect(migrationSql).toContain('public.attendance_records ENABLE ROW LEVEL SECURITY');
    });
  });

  describe('Table 4: assignments RLS Strategy', () => {
    it('restricts students to published assignments only', () => {
      expect(migrationSql).toContain('CREATE POLICY "assignments_select_policy" ON public.assignments');
      expect(migrationSql).toMatch(/assignments_select_policy[\s\S]*?is_published\s*=\s*true/);
    });

    it('allows faculty and admins to author and edit assignments', () => {
      expect(migrationSql).toMatch(/assignments_insert_policy[\s\S]*?is_academic_faculty/);
      expect(migrationSql).toMatch(/assignments_update_policy[\s\S]*?is_academic_faculty/);
    });
  });

  describe('Table 5: submissions RLS Strategy', () => {
    it('restricts peer submission visibility (students only see their own)', () => {
      expect(migrationSql).toContain('CREATE POLICY "submissions_select_policy" ON public.submissions');
      expect(migrationSql).toMatch(/submissions_select_policy[\s\S]*?student_id\s*=\s*public\.get_current_student_id\(\)/);
    });

    it('allows students to insert their own coursework', () => {
      expect(migrationSql).toContain('CREATE POLICY "submissions_insert_policy" ON public.submissions');
      expect(migrationSql).toMatch(/submissions_insert_policy[\s\S]*?student_id\s*=\s*public\.get_current_student_id\(\)/);
    });

    it('prohibits students from modifying already graded submissions', () => {
      expect(migrationSql).toMatch(/submissions_update_policy[\s\S]*?status IN \('draft', 'resubmitted', 'submitted'\)/);
    });
  });

  describe('Table 6: payments RLS Strategy', () => {
    it('restricts payment records view to Finance/Staff and student owner', () => {
      expect(migrationSql).toContain('CREATE POLICY "payments_select_policy" ON public.payments');
      expect(migrationSql).toMatch(/payments_select_policy[\s\S]*?student_id\s*=\s*public\.get_current_student_id\(\)/);
    });

    it('restricts payment creation strictly to Finance Managers and Administrators', () => {
      expect(migrationSql).toContain('CREATE POLICY "payments_insert_policy" ON public.payments');
      expect(migrationSql).toMatch(/payments_insert_policy[\s\S]*?is_finance_manager/);
    });

    it('restricts payment record deletion strictly to Super Administrators', () => {
      expect(migrationSql).toMatch(/payments_delete_policy[\s\S]*?super_admin/);
    });
  });

  describe('Table 7: invoices RLS Strategy', () => {
    it('restricts invoice view to Finance/Staff and student debtor', () => {
      expect(migrationSql).toContain('CREATE POLICY "invoices_select_policy" ON public.invoices');
      expect(migrationSql).toMatch(/invoices_select_policy[\s\S]*?student_id\s*=\s*public\.get_current_student_id\(\)/);
    });

    it('restricts invoice issuance and updates to Finance Managers', () => {
      expect(migrationSql).toMatch(/invoices_insert_policy[\s\S]*?is_finance_manager/);
      expect(migrationSql).toMatch(/invoices_update_policy[\s\S]*?is_finance_manager/);
    });
  });

  describe('Table 8: financial_adjustments RLS Strategy', () => {
    it('restricts adjustment view to Finance/Staff and student account holder', () => {
      expect(migrationSql).toContain('CREATE POLICY "financial_adjustments_select_policy" ON public.financial_adjustments');
      expect(migrationSql).toMatch(/financial_adjustments_select_policy[\s\S]*?get_current_student_id/);
    });

    it('restricts adjustment creation to Finance Managers', () => {
      expect(migrationSql).toMatch(/financial_adjustments_insert_policy[\s\S]*?is_finance_manager/);
    });
  });

  describe('Table 9: refunds RLS Strategy', () => {
    it('restricts refund view to Finance/Staff and student payee', () => {
      expect(migrationSql).toContain('CREATE POLICY "refunds_select_policy" ON public.refunds');
      expect(migrationSql).toMatch(/refunds_select_policy[\s\S]*?student_id\s*=\s*public\.get_current_student_id\(\)/);
    });

    it('restricts refund authorization to Finance Managers and deletion to Super Admin', () => {
      expect(migrationSql).toMatch(/refunds_insert_policy[\s\S]*?is_finance_manager/);
      expect(migrationSql).toMatch(/refunds_delete_policy[\s\S]*?super_admin/);
    });
  });

  describe('Table 10: notifications RLS Strategy', () => {
    it('restricts notification reads to recipients or staff broadcasts', () => {
      expect(migrationSql).toContain('CREATE POLICY "notifications_select_policy" ON public.notifications');
      expect(migrationSql).toMatch(/notifications_select_policy[\s\S]*?recipient_user_id\s*=\s*auth\.uid\(\)/);
    });

    it('permits recipients to mark their own notifications as read or dismiss them', () => {
      expect(migrationSql).toMatch(/notifications_update_policy[\s\S]*?recipient_user_id\s*=\s*auth\.uid\(\)/);
      expect(migrationSql).toMatch(/notifications_delete_policy[\s\S]*?recipient_user_id\s*=\s*auth\.uid\(\)/);
    });
  });

  describe('Table 11: audit_history RLS Strategy', () => {
    it('strictly restricts audit inspection to governance roles (prohibits students and teachers)', () => {
      expect(migrationSql).toContain('CREATE POLICY "audit_history_select_policy" ON public.audit_history');
      expect(migrationSql).toMatch(/audit_history_select_policy[\s\S]*?IN \('super_admin', 'admin', 'registrar', 'finance_officer'\)/);
    });

    it('enforces strict immutability (UPDATE and DELETE prohibited via RLS)', () => {
      expect(migrationSql).toContain('CREATE POLICY "audit_history_no_update_policy" ON public.audit_history');
      expect(migrationSql).toContain('CREATE POLICY "audit_history_no_delete_policy" ON public.audit_history');
      expect(migrationSql).toMatch(/audit_history_no_update_policy[\s\S]*?USING \(false\)/);
      expect(migrationSql).toMatch(/audit_history_no_delete_policy[\s\S]*?USING \(false\)/);
    });
  });

  describe('Anti-Recursion SECURITY DEFINER Functions', () => {
    it('defines role and student identity helpers with SECURITY DEFINER STABLE attributes', () => {
      expect(migrationSql).toMatch(/FUNCTION public\.get_auth_user_role\(\)[\s\S]*?SECURITY DEFINER STABLE/);
      expect(migrationSql).toMatch(/FUNCTION public\.get_current_student_id\(\)[\s\S]*?SECURITY DEFINER STABLE/);
      expect(migrationSql).toMatch(/FUNCTION public\.is_admin\(\)[\s\S]*?SECURITY DEFINER STABLE/);
      expect(migrationSql).toMatch(/FUNCTION public\.is_academic_faculty\(\)[\s\S]*?SECURITY DEFINER STABLE/);
      expect(migrationSql).toMatch(/FUNCTION public\.is_finance_manager\(\)[\s\S]*?SECURITY DEFINER STABLE/);
    });
  });
});
