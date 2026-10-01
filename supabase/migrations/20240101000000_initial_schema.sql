-- ============================================================================
-- HEAVEN TOUCHING EARTH SCHOOL OF MINISTRY (HTEIM) PORTAL SCHEMA
-- Supabase Schema Initialization
-- ============================================================================

-- 1. State synchronization table 'app_states' (Primary Document Store)
CREATE TABLE IF NOT EXISTS public.app_states (
  id text PRIMARY KEY,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by text
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.app_states ENABLE ROW LEVEL SECURITY;

-- Safely recreate policies to avoid migration conflicts
DROP POLICY IF EXISTS "Allow public read access" ON public.app_states;
DROP POLICY IF EXISTS "Allow public insert" ON public.app_states;
DROP POLICY IF EXISTS "Allow public update" ON public.app_states;

CREATE POLICY "Allow public read access" ON public.app_states FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.app_states FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.app_states FOR UPDATE USING (true) WITH CHECK (true);

-- Index for JSON state searching or rapid lookup
CREATE INDEX IF NOT EXISTS idx_app_states_updated_at ON public.app_states (updated_at);


-- 2. State synchronization table 'app_state' (Alternative Isolated Store)
CREATE TABLE IF NOT EXISTS public.app_state (
  email text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

-- Safely recreate student-isolated access policies
DROP POLICY IF EXISTS "Student Isolated Read" ON public.app_state;
DROP POLICY IF EXISTS "Student Isolated Upsert" ON public.app_state;

CREATE POLICY "Student Isolated Read" ON public.app_state
  FOR SELECT USING (
    (auth.jwt() ->> 'email') = email 
    OR (auth.jwt() ->> 'role' = 'service_role')
  );

CREATE POLICY "Student Isolated Upsert" ON public.app_state
  FOR ALL WITH CHECK (
    (auth.jwt() ->> 'email') = email 
    OR (auth.jwt() ->> 'role' = 'service_role')
  );

-- Index for alternative updated tracking
CREATE INDEX IF NOT EXISTS idx_app_state_updated_at ON public.app_state (updated_at);


-- ============================================================================
-- CONCEPTUAL SCHEMAS & DOCUMENTATION
-- ============================================================================
-- Note: The following index definitions are for optional, separate relational tables.
-- They are kept commented out below so they do not cause SQLSTATE 42P01 errors
-- during Supabase migrations, as the current live portal architecture operates on
-- high-speed, synchronized JSON state-aggregation schemas.
--
-- If migrating to separate SQL tables in the future, first execute the corresponding
-- "CREATE TABLE students (...);" statements, then uncomment these indices.

/*
-- Students Table Indices
CREATE INDEX IF NOT EXISTS idx_students_name ON students (student_name);
CREATE INDEX IF NOT EXISTS idx_students_module_track ON students (module_track);
CREATE INDEX IF NOT EXISTS idx_students_status ON students (status);
CREATE INDEX IF NOT EXISTS idx_students_module_status ON students (module_track, status);

-- Attendance Table Indices
CREATE INDEX IF NOT EXISTS idx_attendance_student_name ON attendance (student_name);
CREATE INDEX IF NOT EXISTS idx_attendance_class_day ON attendance (class_day_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_day ON attendance (student_name, class_day_id);
CREATE INDEX IF NOT EXISTS idx_attendance_created_at ON attendance (created_at);

-- Payments Table Indices
CREATE INDEX IF NOT EXISTS idx_payments_student_name ON payments (student_name);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_student_status ON payments (student_name, status);
CREATE INDEX IF NOT EXISTS idx_payments_last_payment_date ON payments (last_payment_date);

-- Assignments Table Indices
CREATE INDEX IF NOT EXISTS idx_assignments_course_code ON assignments (course_code);
CREATE INDEX IF NOT EXISTS idx_assignments_module_track ON assignments (module_track);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments (due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_course_module ON assignments (course_code, module_track);

-- Submissions Table Indices
CREATE INDEX IF NOT EXISTS idx_submissions_student_name ON submissions (student_name);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions (assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions (status);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_status ON submissions (assignment_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_student_assignment ON submissions (student_name, assignment_id);

-- Class Days Table Indices
CREATE INDEX IF NOT EXISTS idx_class_days_created_at ON class_days (created_at);

-- Notifications Table Indices
CREATE INDEX IF NOT EXISTS idx_notifications_student_name ON notifications (student_name);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications (status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_student_status ON notifications (student_name, status);

-- Messages Table Indices
CREATE INDEX IF NOT EXISTS idx_messages_student_name ON messages (student_name);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages (status);

-- Audit Logs Table Indices
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_category ON audit_logs (action_category);

-- Full-Text GIN Search Indices
CREATE INDEX IF NOT EXISTS idx_students_name_gin ON students USING gin (to_tsvector('english', student_name));
CREATE INDEX IF NOT EXISTS idx_assignments_title_gin ON assignments USING gin (to_tsvector('english', title || ' ' || COALESCE(description, '')));
*/
