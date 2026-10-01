-- ============================================================================
-- SCALABLE ACADEMIC DATA MODEL MIGRATION
-- HTEIM School of Ministry
-- ============================================================================

-- Ensure UUID generation extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- AUTOMATED TIMESTAMP TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. STUDENT & USER ENTITIES
-- ============================================================================

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student', 'staff')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users (is_active) WHERE deleted_at IS NULL;

-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  address JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_name ON public.profiles (last_name, first_name);

-- Students Table
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  student_number TEXT NOT NULL UNIQUE,
  enrollment_status TEXT NOT NULL DEFAULT 'active' 
    CHECK (enrollment_status IN ('applied', 'active', 'at_risk', 'on_leave', 'graduated', 'withdrawn')),
  cohort_level TEXT NOT NULL DEFAULT 'Level 1 Foundation'
    CHECK (cohort_level IN ('Level 1 Foundation', 'Level 2 Diploma', 'Level 3 Degree', 'Level 4 Executive')),
  admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students (user_id);
CREATE INDEX IF NOT EXISTS idx_students_student_number ON public.students (student_number);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students (enrollment_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_cohort ON public.students (cohort_level);

-- ============================================================================
-- 2. ACADEMIC CURRICULUM HIERARCHY
-- ============================================================================

-- Academic Years Table
CREATE TABLE IF NOT EXISTS public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT check_academic_year_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_academic_years_code ON public.academic_years (code);
CREATE INDEX IF NOT EXISTS idx_academic_years_status ON public.academic_years (status);

-- Terms / Semesters Table
CREATE TABLE IF NOT EXISTS public.terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  sequence_order INTEGER NOT NULL CHECK (sequence_order > 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('upcoming', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unique_term_code_per_year UNIQUE (academic_year_id, code),
  CONSTRAINT check_term_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_terms_academic_year ON public.terms (academic_year_id);
CREATE INDEX IF NOT EXISTS idx_terms_status ON public.terms (status);

-- Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  credits NUMERIC(4, 2) NOT NULL DEFAULT 3.00 CHECK (credits >= 0),
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unique_course_code_per_term UNIQUE (term_id, code)
);

CREATE INDEX IF NOT EXISTS idx_courses_term_id ON public.courses (term_id);
CREATE INDEX IF NOT EXISTS idx_courses_code ON public.courses (code);

-- Modules Table
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  sequence_order INTEGER NOT NULL CHECK (sequence_order > 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unique_module_sequence UNIQUE (course_id, sequence_order)
);

CREATE INDEX IF NOT EXISTS idx_modules_course_id ON public.modules (course_id);

-- Lessons Table
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sequence_order INTEGER NOT NULL CHECK (sequence_order > 0),
  content TEXT,
  video_url TEXT,
  duration_minutes INTEGER DEFAULT 0 CHECK (duration_minutes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unique_lesson_sequence UNIQUE (module_id, sequence_order)
);

CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON public.lessons (module_id);

-- Assignments Table
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  max_points NUMERIC(6, 2) NOT NULL DEFAULT 100.00 CHECK (max_points > 0),
  weight NUMERIC(4, 2) NOT NULL DEFAULT 1.00 CHECK (weight >= 0),
  due_at TIMESTAMPTZ NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assignments_lesson_id ON public.assignments (lesson_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_at ON public.assignments (due_at);

-- Submissions Table
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'submitted' 
    CHECK (status IN ('draft', 'submitted', 'graded', 'resubmitted', 'late')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submission_content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unique_student_assignment_submission UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.submissions (assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions (student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions (status);

-- Grades Table
-- Note: Calculated percentages & letter grades can safely be calculated from authoritative records (points_awarded / max_points)
CREATE TABLE IF NOT EXISTS public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL UNIQUE REFERENCES public.submissions(id) ON DELETE CASCADE,
  graded_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  points_awarded NUMERIC(6, 2) NOT NULL CHECK (points_awarded >= 0),
  feedback TEXT,
  graded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_grades_submission_id ON public.grades (submission_id);
CREATE INDEX IF NOT EXISTS idx_grades_graded_by ON public.grades (graded_by_user_id);

-- ============================================================================
-- 3. ENROLLMENT RELATIONSHIPS
-- ============================================================================

-- Program Term Enrollments Table
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('enrolled', 'active', 'completed', 'withdrawn', 'deferred')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unique_student_term_enrollment UNIQUE (student_id, academic_year_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON public.enrollments (student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_term_id ON public.enrollments (term_id);

-- Course Specific Enrollments Table
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'enrolled'
    CHECK (status IN ('enrolled', 'in_progress', 'completed', 'failed', 'dropped')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unique_student_course_enrollment UNIQUE (student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_id ON public.course_enrollments (student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON public.course_enrollments (course_id);

-- ============================================================================
-- 4. OPERATIONAL RELATIONSHIPS
-- ============================================================================

-- Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  session_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present' 
    CHECK (status IN ('present', 'absent', 'excused', 'tardy')),
  notes TEXT,
  recorded_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unique_student_course_session UNIQUE (student_id, course_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance (student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course ON public.attendance (course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance (session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance (status);

-- Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  academic_year_id UUID REFERENCES public.academic_years(id),
  term_id UUID REFERENCES public.terms(id),
  amount_due NUMERIC(10, 2) NOT NULL CHECK (amount_due >= 0),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued'
    CHECK (status IN ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invoices_student ON public.invoices (student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (status);

-- Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  payment_number TEXT NOT NULL UNIQUE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'card', 'bank_transfer', 'cash', 'check', 'scholarship', 'other')),
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference_number TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_student ON public.payments (student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments (payment_date);

-- Documents Table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL 
    CHECK (document_type IN ('photo_id', 'statement_of_faith', 'transcript', 'pastoral_reference', 'diploma', 'other')),
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired')),
  verified_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_documents_student ON public.documents (student_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents (verification_status);

-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_role TEXT NOT NULL DEFAULT 'all' CHECK (recipient_role IN ('admin', 'teacher', 'student', 'all')),
  recipient_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  recipient_email TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'academic'
    CHECK (category IN ('academic', 'attendance', 'financial', 'announcement', 'library', 'enrollment', 'system', 'ministry', 'assignment_due', 'assignment_graded', 'attendance_warning', 'payment_due', 'payment_received', 'application_status')),
  event_type TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'medium', 'high', 'urgent', 'critical')),
  read BOOLEAN NOT NULL DEFAULT false,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  action_tab TEXT,
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_role ON public.notifications (recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications (read);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications (category);

-- Ministry Requirements Table
CREATE TABLE IF NOT EXISTS public.ministry_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  requirement_type TEXT NOT NULL 
    CHECK (requirement_type IN ('practicum', 'outreach', 'mentorship', 'service_hours', 'character_reference')),
  required_hours NUMERIC(6, 2) DEFAULT 0 CHECK (required_hours >= 0),
  completed_hours NUMERIC(6, 2) DEFAULT 0 CHECK (completed_hours >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'waived')),
  supervisor_name TEXT,
  supervisor_approval BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ministry_req_student ON public.ministry_requirements (student_id);
CREATE INDEX IF NOT EXISTS idx_ministry_req_status ON public.ministry_requirements (status);

-- Audit History Table
CREATE TABLE IF NOT EXISTS public.audit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'soft_delete', 'restore', 'grade_override', 'attendance_override')),
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_history_actor ON public.audit_history (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_history_entity ON public.audit_history (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_history_timestamp ON public.audit_history (timestamp);

-- ============================================================================
-- 5. ATTACH AUTOMATED TIMESTAMPTZ TRIGGERS
-- ============================================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND column_name = 'updated_at' 
      AND table_name IN (
        'users', 'profiles', 'students', 'academic_years', 'terms', 'courses', 
        'modules', 'lessons', 'assignments', 'submissions', 'grades', 
        'enrollments', 'course_enrollments', 'attendance', 'invoices', 
        'payments', 'documents', 'ministry_requirements'
      )
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_set_updated_at_%I ON public.%I;
      CREATE TRIGGER trg_set_updated_at_%I
        BEFORE UPDATE ON public.%I
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at_timestamp();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- ============================================================================
-- 6. AUTHORITATIVE COMPUTED VIEWS (No Redundant Calculated Values Stored)
-- ============================================================================

-- View: Student Attendance Rates (Calculated from authoritative attendance log records)
CREATE OR REPLACE VIEW public.v_student_attendance_summary AS
SELECT 
  s.id AS student_id,
  s.student_number,
  p.first_name || ' ' || p.last_name AS student_name,
  COUNT(a.id) AS total_sessions_logged,
  COUNT(CASE WHEN a.status = 'present' THEN 1 END) AS present_count,
  COUNT(CASE WHEN a.status = 'tardy' THEN 1 END) AS tardy_count,
  COUNT(CASE WHEN a.status = 'excused' THEN 1 END) AS excused_count,
  COUNT(CASE WHEN a.status = 'absent' THEN 1 END) AS absent_count,
  CASE 
    WHEN COUNT(a.id) = 0 THEN 100.00
    ELSE ROUND((COUNT(CASE WHEN a.status IN ('present', 'tardy', 'excused') THEN 1 END)::NUMERIC / COUNT(a.id)::NUMERIC) * 100.00, 2)
  END AS attendance_percentage,
  CASE 
    WHEN COUNT(a.id) > 0 AND (COUNT(CASE WHEN a.status IN ('present', 'tardy', 'excused') THEN 1 END)::NUMERIC / COUNT(a.id)::NUMERIC) < 0.75 
    THEN true ELSE false 
  END AS is_at_risk
FROM public.students s
JOIN public.profiles p ON s.user_id = p.user_id
LEFT JOIN public.attendance a ON s.id = a.student_id AND a.deleted_at IS NULL
WHERE s.deleted_at IS NULL
GROUP BY s.id, s.student_number, p.first_name, p.last_name;

-- View: Student Financial Statements (Calculated from authoritative invoices and payments)
CREATE OR REPLACE VIEW public.v_student_financial_summary AS
SELECT 
  s.id AS student_id,
  s.student_number,
  p.first_name || ' ' || p.last_name AS student_name,
  COALESCE(SUM(inv.amount_due), 0.00) AS total_invoiced,
  COALESCE(SUM(pmt.amount), 0.00) AS total_paid,
  COALESCE(SUM(inv.amount_due), 0.00) - COALESCE(SUM(pmt.amount), 0.00) AS outstanding_balance,
  CASE 
    WHEN COALESCE(SUM(inv.amount_due), 0.00) - COALESCE(SUM(pmt.amount), 0.00) > 0 THEN true 
    ELSE false 
  END AS has_overdue_balance
FROM public.students s
JOIN public.profiles p ON s.user_id = p.user_id
LEFT JOIN public.invoices inv ON s.id = inv.student_id AND inv.deleted_at IS NULL AND inv.status != 'cancelled'
LEFT JOIN public.payments pmt ON inv.id = pmt.invoice_id AND pmt.deleted_at IS NULL AND pmt.status = 'completed'
WHERE s.deleted_at IS NULL
GROUP BY s.id, s.student_number, p.first_name, p.last_name;

-- View: Academic Grade Summaries (Calculated from grades points_awarded / assignment max_points)
CREATE OR REPLACE VIEW public.v_student_academic_summary AS
SELECT 
  s.id AS student_id,
  s.student_number,
  p.first_name || ' ' || p.last_name AS student_name,
  COUNT(sub.id) AS total_submissions,
  COUNT(g.id) AS graded_submissions,
  COALESCE(ROUND(AVG((g.points_awarded / asg.max_points) * 100.00), 2), 0.00) AS average_grade_percentage
FROM public.students s
JOIN public.profiles p ON s.user_id = p.user_id
LEFT JOIN public.submissions sub ON s.id = sub.student_id AND sub.deleted_at IS NULL
LEFT JOIN public.assignments asg ON sub.assignment_id = asg.id AND asg.deleted_at IS NULL
LEFT JOIN public.grades g ON sub.id = g.submission_id AND g.deleted_at IS NULL
WHERE s.deleted_at IS NULL
GROUP BY s.id, s.student_number, p.first_name, p.last_name;

-- ============================================================================
-- 7. ENABLE ROW LEVEL SECURITY (RLS) & ACCESS POLICIES
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministry_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_history ENABLE ROW LEVEL SECURITY;

-- Generic Public / Authenticated RLS Policies (safely dropped & recreated)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN (
        'users', 'profiles', 'students', 'academic_years', 'terms', 'courses', 
        'modules', 'lessons', 'assignments', 'submissions', 'grades', 
        'enrollments', 'course_enrollments', 'attendance', 'invoices', 
        'payments', 'documents', 'notifications', 'ministry_requirements', 'audit_history'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated select %I" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated insert %I" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated update %I" ON public.%I;', tbl, tbl);
    
    EXECUTE format('CREATE POLICY "Allow authenticated select %I" ON public.%I FOR SELECT USING (true);', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow authenticated insert %I" ON public.%I FOR INSERT WITH CHECK (true);', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow authenticated update %I" ON public.%I FOR UPDATE USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END;
$$;
