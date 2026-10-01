-- ============================================================================
-- NOTIFICATION SYSTEM ARCHITECTURE MIGRATION
-- HTEIM School of Ministry
-- ============================================================================
-- Provides durable multi-role notification records, delivery channel tracking
-- (In-App active, Email ready, Push ready, WhatsApp staged), and preference controls.
-- ============================================================================

-- 1. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_role TEXT NOT NULL DEFAULT 'all',
  recipient_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  recipient_email TEXT,
  category TEXT NOT NULL DEFAULT 'academic',
  event_type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  action_tab TEXT,
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all required columns exist even if public.notifications was previously created by an earlier migration
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_role TEXT NOT NULL DEFAULT 'all';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_student_id UUID REFERENCES public.students(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_email TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'academic';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'general';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_tab TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- If user_id was NOT NULL in an earlier schema, drop the NOT NULL constraint to allow system/role-wide alerts
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'user_id' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.notifications ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- If is_read existed on an earlier version of the table, synchronize into 'read'
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'is_read'
  ) THEN
    UPDATE public.notifications SET read = is_read WHERE read IS DISTINCT FROM is_read;
  END IF;
END $$;

-- Refresh check constraints safely so earlier restrictive definitions don't block new event types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_category_check;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_priority_check;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_recipient_role_check;

ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_recipient_role_check 
  CHECK (recipient_role IN ('admin', 'teacher', 'student', 'all'));

ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_priority_check 
  CHECK (priority IN ('low', 'normal', 'medium', 'high', 'urgent', 'critical'));

ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_category_check 
  CHECK (category IN (
    'academic', 'attendance', 'financial', 'announcement', 'library', 
    'enrollment', 'system', 'ministry', 'assignment_due', 'assignment_graded', 
    'attendance_warning', 'payment_due', 'payment_received', 'application_status'
  ));

CREATE INDEX IF NOT EXISTS idx_notifications_role ON public.notifications (recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user ON public.notifications (recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_student ON public.notifications (recipient_student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications (read);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications (category);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

-- 2. Notification Delivery Logs (In-App, Email, Push, WhatsApp)
CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'push', 'whatsapp', 'sms')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('delivered', 'sent', 'queued', 'failed', 'skipped', 'pending')),
  recipient_target TEXT,
  response_payload JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_notification ON public.notification_delivery_logs (notification_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_channel ON public.notification_delivery_logs (channel);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_status ON public.notification_delivery_logs (status);

-- 3. Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student',
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  channels_enabled JSONB NOT NULL DEFAULT '{"in_app": true, "email": true, "push": true, "whatsapp": false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_notification_pref UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_pref_user ON public.notification_preferences (user_id);

-- 4. Initial Seed Notifications (Demonstrating Both Student and Administrator Events)
INSERT INTO public.notifications (
  recipient_role, category, event_type, title, message, priority, read, action_tab
)
SELECT * FROM (VALUES
  -- Student notifications
  ('student'::text, 'academic'::text, 'new_assignment'::text, 'New Exegesis Paper Assigned: SOM-101'::text, 'Pastor John Selkridge has posted a new Hermeneutical Exegesis assignment due next Tuesday.'::text, 'normal'::text, false, 'courses'::text),
  ('student'::text, 'academic'::text, 'assignment_deadline'::text, 'Deadline Approaching: Evangelism Practicum Log'::text, 'Your 2-page personal soul-winning practicum report is due in 48 hours for SOM-102.'::text, 'high'::text, false, 'courses'::text),
  ('student'::text, 'academic'::text, 'grade_published'::text, 'Grade Published: Pastoral Ethics Exam'::text, 'Your evaluation for Ministerial Ethics Module 3 has been graded: 92% (A - High Distinction).'::text, 'normal'::text, false, 'courses'::text),
  ('student'::text, 'attendance'::text, 'attendance_warning'::text, 'Institutional Attendance Warning (< 75%)'::text, 'Your attendance rate in Module 2 Evangelism is currently 66.7%, below the mandatory 75% threshold. Please review your session records.'::text, 'urgent'::text, false, 'attendance'::text),
  ('student'::text, 'financial'::text, 'payment_reminder'::text, 'Tuition Installment Notice: 2026 Semester 1'::text, 'Your second semester tuition installment is due on the 15th. Check your payment statement to view receipts and balances.'::text, 'high'::text, false, 'payments'::text),
  ('student'::text, 'announcement'::text, 'new_announcement'::text, 'Apostolic Convocation & Live Broadcast'::text, 'Special Ministry Convocation this Friday at 7:00 PM EST with Apostle Dr. Kendell Pierre. Broadcast live on zoom.'::text, 'normal'::text, false, 'home'::text),
  ('student'::text, 'enrollment'::text, 'registration_confirmation'::text, 'Course Registration Confirmed'::text, 'You are officially enrolled in SOM-101 Biblical Hermeneutics for 2026 Semester 1.'::text, 'normal'::text, true, 'courses'::text),
  ('student'::text, 'library'::text, 'library_resource_added'::text, 'New Ministerial Resource Uploaded'::text, 'The "Hermeneutics & Exegesis Handout 2026" PDF syllabus has been added to the institutional digital library.'::text, 'low'::text, true, 'library'::text),

  -- Administrator notifications
  ('admin'::text, 'enrollment'::text, 'new_enrollment'::text, 'New Student Application Submitted'::text, 'Pastor David Warner submitted an application for the Level 1 Foundation Cohort.'::text, 'normal'::text, false, 'students'::text),
  ('admin'::text, 'financial'::text, 'payment_received'::text, 'Tuition Payment Received: $250.00'::text, 'Student Abigail Selkridge submitted payment for 2026 Semester 1 tuition via Bank Transfer.'::text, 'normal'::text, false, 'payments'::text),
  ('admin'::text, 'financial'::text, 'outstanding_balance'::text, 'Overdue Balance Notice: 3 Students'::text, 'Three students have outstanding tuition balances totaling $750.00 that are past due for Semester 1.'::text, 'high'::text, false, 'payments'::text),
  ('admin'::text, 'attendance'::text, 'attendance_issue'::text, 'At-Risk Attendance Flagged: Minister Christy Ruben'::text, 'Minister Christy Ruben attendance rate dropped to 66.7% in SOM-102 (At-Risk trigger < 75%).'::text, 'urgent'::text, false, 'attendance'::text),
  ('admin'::text, 'academic'::text, 'assignment_submitted'::text, 'Assignment Submissions Ready for Grading'::text, '4 students have submitted their Module 1 Exegesis papers in SOM-101.'::text, 'normal'::text, false, 'courses'::text),
  ('admin'::text, 'academic'::text, 'lecturer_pending_grades'::text, 'Pending Grades Alert: SOM-104'::text, 'Lecturer grades for Apostolic Governance Quiz #1 are pending evaluation beyond the 5-day SLA.'::text, 'high'::text, false, 'courses'::text)
) AS v(recipient_role, category, event_type, title, message, priority, read, action_tab)
WHERE NOT EXISTS (
  SELECT 1 FROM public.notifications n WHERE n.title = v.title
);

-- 5. Row Level Security & Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['notifications', 'notification_delivery_logs', 'notification_preferences'])
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

