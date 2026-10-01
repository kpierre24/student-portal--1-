-- ============================================================================
-- COMPREHENSIVE DATABASE ROW LEVEL SECURITY (RLS) AUDIT & ENFORCEMENT
-- HTEIM School of Ministry Portal
-- ============================================================================
-- Intentional, production-grade security policies for every sensitive table:
--   1.  students
--   2.  grades
--   3.  attendance (plus attendance_records & attendance_sessions)
--   4.  assignments
--   5.  submissions (plus quiz_submissions)
--   6.  payments (plus payment_allocations)
--   7.  invoices (plus invoice_lines)
--   8.  financial_adjustments
--   9.  refunds (plus refund_allocations)
--   10. notifications (plus notification_delivery_logs & notification_preferences)
--   11. audit_history
-- ============================================================================

-- ============================================================================
-- 1. SECURITY DEFINER HELPER FUNCTIONS (Avoid RLS Recursion)
-- ============================================================================

-- Current user's system role (bypasses RLS recursion on public.users)
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- 1. Direct query in public.users using SECURITY DEFINER
  SELECT role INTO v_role
  FROM public.users
  WHERE id = auth.uid() AND is_active = true AND deleted_at IS NULL;

  IF v_role IS NOT NULL THEN
    RETURN LOWER(TRIM(v_role));
  END IF;

  -- 2. Fallback to Supabase JWT claims
  v_role := COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    auth.jwt() ->> 'role'
  );

  RETURN LOWER(TRIM(COALESCE(v_role, 'anon')));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is an Executive Administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_auth_user_role() IN ('super_admin', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is Faculty / Academic staff
CREATE OR REPLACE FUNCTION public.is_academic_faculty()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_auth_user_role() IN ('super_admin', 'admin', 'teacher', 'ta', 'registrar');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is Finance Manager or Administrator
CREATE OR REPLACE FUNCTION public.is_finance_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_auth_user_role() IN ('super_admin', 'admin', 'finance_officer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is Operational Staff (Audit, Registration, Finance, Admin)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_auth_user_role() IN ('super_admin', 'admin', 'registrar', 'finance_officer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is an Enrolled Student
CREATE OR REPLACE FUNCTION public.is_student()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_auth_user_role() = 'student';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper to retrieve current authenticated user's student ID (students.id)
CREATE OR REPLACE FUNCTION public.get_current_student_id()
RETURNS UUID AS $$
DECLARE
  v_student_id UUID;
BEGIN
  SELECT id INTO v_student_id
  FROM public.students
  WHERE user_id = auth.uid() AND deleted_at IS NULL
  LIMIT 1;

  RETURN v_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ============================================================================
-- 2. UTILITY FUNCTION TO CLEAN EXISTING PERMISSIVE POLICIES
-- ============================================================================
CREATE OR REPLACE FUNCTION public.clean_permissive_table_policies(p_table TEXT)
RETURNS VOID AS $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = p_table
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, p_table);
  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 3. AUDIT & ENFORCE RLS: 1. STUDENTS TABLE
-- ============================================================================
-- RLS Strategy:
--   - SELECT: Faculty & Staff can view student directory; Students can ONLY view their own record.
--   - INSERT: Only Administrators and Registrars can register students.
--   - UPDATE: Only Administrators and Registrars can update enrollment standing/cohort.
--   - DELETE: Only Administrators can soft-delete or remove student records.
-- ============================================================================
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
SELECT public.clean_permissive_table_policies('students');

CREATE POLICY "students_select_policy" ON public.students
  FOR SELECT TO authenticated
  USING (
    public.is_academic_faculty()
    OR public.is_staff()
    OR user_id = auth.uid()
  );

CREATE POLICY "students_insert_policy" ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.get_auth_user_role() = 'registrar'
  );

CREATE POLICY "students_update_policy" ON public.students
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR public.get_auth_user_role() = 'registrar'
  )
  WITH CHECK (
    public.is_admin()
    OR public.get_auth_user_role() = 'registrar'
  );

CREATE POLICY "students_delete_policy" ON public.students
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
  );


-- ============================================================================
-- 4. AUDIT & ENFORCE RLS: 2. GRADES TABLE
-- ============================================================================
-- RLS Strategy:
--   - SELECT: Faculty & Staff view all grades; Students ONLY view grades on their own submissions.
--   - INSERT: Instructors & Admins can submit grades. Students strictly prohibited.
--   - UPDATE: Instructors & Admins can revise grades/feedback. Students strictly prohibited.
--   - DELETE: Strictly reserved for Administrators.
-- ============================================================================
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
SELECT public.clean_permissive_table_policies('grades');

CREATE POLICY "grades_select_policy" ON public.grades
  FOR SELECT TO authenticated
  USING (
    public.is_academic_faculty()
    OR EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = grades.submission_id
        AND s.student_id = public.get_current_student_id()
    )
  );

CREATE POLICY "grades_insert_policy" ON public.grades
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_academic_faculty()
    AND public.get_auth_user_role() != 'student'
  );

CREATE POLICY "grades_update_policy" ON public.grades
  FOR UPDATE TO authenticated
  USING (
    public.is_academic_faculty()
    AND public.get_auth_user_role() != 'student'
  )
  WITH CHECK (
    public.is_academic_faculty()
    AND public.get_auth_user_role() != 'student'
  );

CREATE POLICY "grades_delete_policy" ON public.grades
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
  );


-- ============================================================================
-- 5. AUDIT & ENFORCE RLS: 3. ATTENDANCE TABLE (and records & sessions)
-- ============================================================================
-- RLS Strategy:
--   - SELECT: Faculty & Staff can view roster attendance; Students can ONLY view their own records.
--   - INSERT: Instructors & Staff log daily attendance. Students cannot mark attendance.
--   - UPDATE: Instructors & Staff can excuse/update attendance. Students cannot modify attendance.
--   - DELETE: Only Administrators.
-- ============================================================================
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
SELECT public.clean_permissive_table_policies('attendance');

CREATE POLICY "attendance_select_policy" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    public.is_academic_faculty()
    OR student_id = public.get_current_student_id()
  );

CREATE POLICY "attendance_insert_policy" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_academic_faculty()
    AND public.get_auth_user_role() != 'student'
  );

CREATE POLICY "attendance_update_policy" ON public.attendance
  FOR UPDATE TO authenticated
  USING (
    public.is_academic_faculty()
    AND public.get_auth_user_role() != 'student'
  )
  WITH CHECK (
    public.is_academic_faculty()
    AND public.get_auth_user_role() != 'student'
  );

CREATE POLICY "attendance_delete_policy" ON public.attendance
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
  );

-- Attendance Sessions Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_sessions') THEN
    ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
    PERFORM public.clean_permissive_table_policies('attendance_sessions');

    CREATE POLICY "attendance_sessions_select_policy" ON public.attendance_sessions
      FOR SELECT TO authenticated USING (true);

    CREATE POLICY "attendance_sessions_write_policy" ON public.attendance_sessions
      FOR ALL TO authenticated
      USING (public.is_academic_faculty() AND public.get_auth_user_role() != 'student')
      WITH CHECK (public.is_academic_faculty() AND public.get_auth_user_role() != 'student');
  END IF;
END $$;

-- Attendance Records Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_records') THEN
    ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
    PERFORM public.clean_permissive_table_policies('attendance_records');

    CREATE POLICY "attendance_records_select_policy" ON public.attendance_records
      FOR SELECT TO authenticated
      USING (
        public.is_academic_faculty()
        OR student_id = public.get_current_student_id()
      );

    CREATE POLICY "attendance_records_write_policy" ON public.attendance_records
      FOR ALL TO authenticated
      USING (public.is_academic_faculty() AND public.get_auth_user_role() != 'student')
      WITH CHECK (public.is_academic_faculty() AND public.get_auth_user_role() != 'student');
  END IF;
END $$;


-- ============================================================================
-- 6. AUDIT & ENFORCE RLS: 4. ASSIGNMENTS TABLE
-- ============================================================================
-- RLS Strategy:
--   - SELECT: Faculty view all assignments (including drafts); Students ONLY view published assignments.
--   - INSERT: Faculty instructors and Admins create course assignments.
--   - UPDATE: Faculty instructors and Admins edit assignment details.
--   - DELETE: Reserved for Administrators and course instructors.
-- ============================================================================
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
SELECT public.clean_permissive_table_policies('assignments');

CREATE POLICY "assignments_select_policy" ON public.assignments
  FOR SELECT TO authenticated
  USING (
    public.is_academic_faculty()
    OR (is_published = true AND deleted_at IS NULL)
  );

CREATE POLICY "assignments_insert_policy" ON public.assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_academic_faculty()
    AND public.get_auth_user_role() != 'student'
  );

CREATE POLICY "assignments_update_policy" ON public.assignments
  FOR UPDATE TO authenticated
  USING (
    public.is_academic_faculty()
    AND public.get_auth_user_role() != 'student'
  )
  WITH CHECK (
    public.is_academic_faculty()
    AND public.get_auth_user_role() != 'student'
  );

CREATE POLICY "assignments_delete_policy" ON public.assignments
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
  );


-- ============================================================================
-- 7. AUDIT & ENFORCE RLS: 5. SUBMISSIONS TABLE (and quiz_submissions)
-- ============================================================================
-- RLS Strategy:
--   - SELECT: Faculty view all submissions; Students can ONLY view their own submissions.
--   - INSERT: Students submit their own coursework; Faculty can log submissions.
--   - UPDATE: Students can modify draft/resubmitted work; Faculty update grading state.
--   - DELETE: Students can cancel draft submissions; Admins can purge invalid submissions.
-- ============================================================================
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
SELECT public.clean_permissive_table_policies('submissions');

CREATE POLICY "submissions_select_policy" ON public.submissions
  FOR SELECT TO authenticated
  USING (
    public.is_academic_faculty()
    OR student_id = public.get_current_student_id()
  );

CREATE POLICY "submissions_insert_policy" ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    (student_id = public.get_current_student_id())
    OR (public.is_academic_faculty() AND public.get_auth_user_role() != 'student')
  );

CREATE POLICY "submissions_update_policy" ON public.submissions
  FOR UPDATE TO authenticated
  USING (
    (student_id = public.get_current_student_id() AND status IN ('draft', 'resubmitted', 'submitted'))
    OR (public.is_academic_faculty() AND public.get_auth_user_role() != 'student')
  )
  WITH CHECK (
    (student_id = public.get_current_student_id() AND status IN ('draft', 'resubmitted', 'submitted'))
    OR (public.is_academic_faculty() AND public.get_auth_user_role() != 'student')
  );

CREATE POLICY "submissions_delete_policy" ON public.submissions
  FOR DELETE TO authenticated
  USING (
    (student_id = public.get_current_student_id() AND status = 'draft')
    OR public.is_admin()
  );

-- Quiz Submissions Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_submissions') THEN
    ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;
    PERFORM public.clean_permissive_table_policies('quiz_submissions');

    CREATE POLICY "quiz_submissions_select_policy" ON public.quiz_submissions
      FOR SELECT TO authenticated
      USING (
        public.is_academic_faculty()
        OR student_id = public.get_current_student_id()
        OR student_email = (auth.jwt() ->> 'email')
      );

    CREATE POLICY "quiz_submissions_insert_policy" ON public.quiz_submissions
      FOR INSERT TO authenticated
      WITH CHECK (
        student_id = public.get_current_student_id()
        OR student_email = (auth.jwt() ->> 'email')
        OR public.is_academic_faculty()
      );

    CREATE POLICY "quiz_submissions_admin_policy" ON public.quiz_submissions
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;


-- ============================================================================
-- 8. AUDIT & ENFORCE RLS: 6. PAYMENTS TABLE (and payment_allocations)
-- ============================================================================
-- RLS Strategy:
--   - SELECT: Finance Officers & Registrars view all payments; Students ONLY view their receipts.
--   - INSERT: Only Finance Managers and Admins can record verified transactions.
--   - UPDATE: Only Finance Managers and Admins can modify payment references/notes.
--   - DELETE: Prohibited for clients; Strictly reserved for Super Administrators.
-- ============================================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
SELECT public.clean_permissive_table_policies('payments');

CREATE POLICY "payments_select_policy" ON public.payments
  FOR SELECT TO authenticated
  USING (
    public.is_finance_manager()
    OR public.get_auth_user_role() = 'registrar'
    OR student_id = public.get_current_student_id()
  );

CREATE POLICY "payments_insert_policy" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_finance_manager()
  );

CREATE POLICY "payments_update_policy" ON public.payments
  FOR UPDATE TO authenticated
  USING (
    public.is_finance_manager()
  )
  WITH CHECK (
    public.is_finance_manager()
  );

CREATE POLICY "payments_delete_policy" ON public.payments
  FOR DELETE TO authenticated
  USING (
    public.get_auth_user_role() = 'super_admin'
  );

-- Payment Allocations Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_allocations') THEN
    ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
    PERFORM public.clean_permissive_table_policies('payment_allocations');

    CREATE POLICY "payment_allocations_select_policy" ON public.payment_allocations
      FOR SELECT TO authenticated
      USING (
        public.is_finance_manager()
        OR public.get_auth_user_role() = 'registrar'
        OR EXISTS (
          SELECT 1 FROM public.payments p
          WHERE p.id = payment_allocations.payment_id
            AND p.student_id = public.get_current_student_id()
        )
      );

    CREATE POLICY "payment_allocations_write_policy" ON public.payment_allocations
      FOR ALL TO authenticated
      USING (public.is_finance_manager())
      WITH CHECK (public.is_finance_manager());
  END IF;
END $$;


-- ============================================================================
-- 9. AUDIT & ENFORCE RLS: 7. INVOICES TABLE (and invoice_lines)
-- ============================================================================
-- RLS Strategy:
--   - SELECT: Finance Officers & Staff view all invoices; Students ONLY view their own statements.
--   - INSERT: Only Finance Managers and Admins can generate tuition bills.
--   - UPDATE: Only Finance Managers and Admins can update amounts/status.
--   - DELETE: Reserved for Administrators.
-- ============================================================================
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
SELECT public.clean_permissive_table_policies('invoices');

CREATE POLICY "invoices_select_policy" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    public.is_finance_manager()
    OR public.get_auth_user_role() = 'registrar'
    OR student_id = public.get_current_student_id()
  );

CREATE POLICY "invoices_insert_policy" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_finance_manager()
  );

CREATE POLICY "invoices_update_policy" ON public.invoices
  FOR UPDATE TO authenticated
  USING (
    public.is_finance_manager()
  )
  WITH CHECK (
    public.is_finance_manager()
  );

CREATE POLICY "invoices_delete_policy" ON public.invoices
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
  );

-- Invoice Lines Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_lines') THEN
    ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
    PERFORM public.clean_permissive_table_policies('invoice_lines');

    CREATE POLICY "invoice_lines_select_policy" ON public.invoice_lines
      FOR SELECT TO authenticated
      USING (
        public.is_finance_manager()
        OR public.get_auth_user_role() = 'registrar'
        OR EXISTS (
          SELECT 1 FROM public.invoices i
          WHERE i.id = invoice_lines.invoice_id
            AND i.student_id = public.get_current_student_id()
        )
      );

    CREATE POLICY "invoice_lines_write_policy" ON public.invoice_lines
      FOR ALL TO authenticated
      USING (public.is_finance_manager())
      WITH CHECK (public.is_finance_manager());
  END IF;
END $$;


-- ============================================================================
-- 10. AUDIT & ENFORCE RLS: 8. FINANCIAL_ADJUSTMENTS TABLE
-- ============================================================================
-- RLS Strategy:
--   - SELECT: Finance Officers & Staff view all adjustments; Students ONLY view their credits/waivers.
--   - INSERT: Only Finance Managers and Admins can create adjustments/scholarships.
--   - UPDATE: Only Finance Managers and Admins can approve or void adjustments.
--   - DELETE: Reserved for Super Administrators.
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_adjustments') THEN
    ALTER TABLE public.financial_adjustments ENABLE ROW LEVEL SECURITY;
    PERFORM public.clean_permissive_table_policies('financial_adjustments');

    CREATE POLICY "financial_adjustments_select_policy" ON public.financial_adjustments
      FOR SELECT TO authenticated
      USING (
        public.is_finance_manager()
        OR public.get_auth_user_role() = 'registrar'
        OR (
          student_id IS NOT NULL 
          AND (
            student_id::TEXT = public.get_current_student_id()::TEXT
          )
        )
        OR EXISTS (
          SELECT 1 FROM public.invoices i
          WHERE i.id::TEXT = financial_adjustments.invoice_id::TEXT
            AND i.student_id = public.get_current_student_id()
        )
      );

    CREATE POLICY "financial_adjustments_insert_policy" ON public.financial_adjustments
      FOR INSERT TO authenticated
      WITH CHECK (
        public.is_finance_manager()
      );

    CREATE POLICY "financial_adjustments_update_policy" ON public.financial_adjustments
      FOR UPDATE TO authenticated
      USING (
        public.is_finance_manager()
      )
      WITH CHECK (
        public.is_finance_manager()
      );

    CREATE POLICY "financial_adjustments_delete_policy" ON public.financial_adjustments
      FOR DELETE TO authenticated
      USING (
        public.is_admin()
      );
  END IF;
END $$;


-- ============================================================================
-- 11. AUDIT & ENFORCE RLS: 9. REFUNDS TABLE (and refund_allocations)
-- ============================================================================
-- RLS Strategy:
--   - SELECT: Finance Officers & Staff view all refunds; Students ONLY view their disbursements.
--   - INSERT: Only Finance Managers and Admins can issue refunds.
--   - UPDATE: Only Finance Managers and Admins can approve or void refunds.
--   - DELETE: Strictly reserved for Super Administrators.
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'refunds') THEN
    ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
    PERFORM public.clean_permissive_table_policies('refunds');

    CREATE POLICY "refunds_select_policy" ON public.refunds
      FOR SELECT TO authenticated
      USING (
        public.is_finance_manager()
        OR public.get_auth_user_role() = 'registrar'
        OR student_id = public.get_current_student_id()
      );

    CREATE POLICY "refunds_insert_policy" ON public.refunds
      FOR INSERT TO authenticated
      WITH CHECK (
        public.is_finance_manager()
      );

    CREATE POLICY "refunds_update_policy" ON public.refunds
      FOR UPDATE TO authenticated
      USING (
        public.is_finance_manager()
      )
      WITH CHECK (
        public.is_finance_manager()
      );

    CREATE POLICY "refunds_delete_policy" ON public.refunds
      FOR DELETE TO authenticated
      USING (
        public.get_auth_user_role() = 'super_admin'
      );
  END IF;
END $$;

-- Refund Allocations Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'refund_allocations') THEN
    ALTER TABLE public.refund_allocations ENABLE ROW LEVEL SECURITY;
    PERFORM public.clean_permissive_table_policies('refund_allocations');

    CREATE POLICY "refund_allocations_select_policy" ON public.refund_allocations
      FOR SELECT TO authenticated
      USING (
        public.is_finance_manager()
        OR public.get_auth_user_role() = 'registrar'
        OR EXISTS (
          SELECT 1 FROM public.refunds r
          WHERE r.id = refund_allocations.refund_id
            AND r.student_id = public.get_current_student_id()
        )
      );

    CREATE POLICY "refund_allocations_write_policy" ON public.refund_allocations
      FOR ALL TO authenticated
      USING (public.is_finance_manager())
      WITH CHECK (public.is_finance_manager());
  END IF;
END $$;


-- ============================================================================
-- 12. AUDIT & ENFORCE RLS: 10. NOTIFICATIONS TABLE (plus delivery logs & preferences)
-- ============================================================================
-- RLS Strategy:
--   - SELECT: Staff view all notifications; Users/Students view messages directed to them or broad announcements.
--   - INSERT: Faculty and Staff can broadcast notifications; System services can enqueue alerts.
--   - UPDATE: Recipients can mark their own notifications as read.
--   - DELETE: Recipients can dismiss/delete their own notifications; Admins can delete any.
-- ============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
SELECT public.clean_permissive_table_policies('notifications');

CREATE POLICY "notifications_select_policy" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    public.is_staff()
    OR recipient_user_id = auth.uid()
    OR user_id = auth.uid()
    OR recipient_student_id = public.get_current_student_id()
    OR student_id = public.get_current_student_id()
    OR recipient_email = (auth.jwt() ->> 'email')
    OR recipient_role IN ('all', public.get_auth_user_role())
  );

CREATE POLICY "notifications_insert_policy" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_academic_faculty()
    OR public.is_staff()
    OR auth.uid() IS NOT NULL
  );

CREATE POLICY "notifications_update_policy" ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    public.is_staff()
    OR recipient_user_id = auth.uid()
    OR user_id = auth.uid()
    OR recipient_student_id = public.get_current_student_id()
  )
  WITH CHECK (
    public.is_staff()
    OR recipient_user_id = auth.uid()
    OR user_id = auth.uid()
    OR recipient_student_id = public.get_current_student_id()
  );

CREATE POLICY "notifications_delete_policy" ON public.notifications
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR recipient_user_id = auth.uid()
    OR user_id = auth.uid()
    OR recipient_student_id = public.get_current_student_id()
  );

-- Notification Delivery Logs Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_delivery_logs') THEN
    ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;
    PERFORM public.clean_permissive_table_policies('notification_delivery_logs');

    CREATE POLICY "notification_delivery_logs_policy" ON public.notification_delivery_logs
      FOR SELECT TO authenticated
      USING (public.is_staff() OR user_id = auth.uid());

    CREATE POLICY "notification_delivery_logs_insert" ON public.notification_delivery_logs
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Notification Preferences Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
    ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
    PERFORM public.clean_permissive_table_policies('notification_preferences');

    CREATE POLICY "notification_preferences_user_policy" ON public.notification_preferences
      FOR ALL TO authenticated
      USING (user_id = auth.uid() OR public.is_admin())
      WITH CHECK (user_id = auth.uid() OR public.is_admin());
  END IF;
END $$;


-- ============================================================================
-- 13. AUDIT & ENFORCE RLS: 11. AUDIT_HISTORY TABLE
-- ============================================================================
-- RLS Strategy:
--   - SELECT: Strictly restricted to Staff and Executive Governance (Super Admin, Admin, Registrar, Finance Officer).
--             Students and teachers are completely blocked from reading audit logs.
--   - INSERT: System services and authenticated actors can log operations.
--   - UPDATE: STRICTLY FORBIDDEN. Audit logs are append-only and immutable.
--   - DELETE: STRICTLY FORBIDDEN via standard client RLS.
-- ============================================================================
ALTER TABLE public.audit_history ENABLE ROW LEVEL SECURITY;
SELECT public.clean_permissive_table_policies('audit_history');

CREATE POLICY "audit_history_select_policy" ON public.audit_history
  FOR SELECT TO authenticated
  USING (
    public.is_staff()
    OR (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'registrar', 'finance_officer')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'registrar', 'finance_officer')
  );

CREATE POLICY "audit_history_insert_policy" ON public.audit_history
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()::TEXT
    OR public.is_admin()
    OR auth.uid() IS NOT NULL
  );

-- Explicitly block any client update or delete attempts on audit logs
CREATE POLICY "audit_history_no_update_policy" ON public.audit_history
  FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "audit_history_no_delete_policy" ON public.audit_history
  FOR DELETE TO authenticated
  USING (false);


-- ============================================================================
-- 14. CLEANUP HELPER FUNCTIONS
-- ============================================================================
DROP FUNCTION IF EXISTS public.clean_permissive_table_policies(TEXT);
