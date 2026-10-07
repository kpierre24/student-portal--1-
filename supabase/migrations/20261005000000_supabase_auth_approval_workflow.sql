-- ============================================================================
-- SUPABASE AUTHENTICATION & MULTI-ROLE ACCOUNT APPROVAL WORKFLOW
-- HTEIM School of Ministry
-- ============================================================================
-- Architecture:
-- 1. Setup happens within the app (Registration / Sign-up for Super Admin, Admin, Teacher, Student).
-- 2. Approval happens through Supabase:
--    - In Supabase Table Editor on public.user_approval_requests (or public.users)
--    - In Supabase SQL Editor via public.approve_user() and public.reject_user()
--    - In Supabase Dashboard via auth.users metadata
--    - In-App via the Administrator Pending Approvals portal connected to Supabase
-- 3. Trigger synchronization automatically activates user, grants role permissions,
--    and provisions student/faculty linkages upon approval.
-- ============================================================================

-- 1. Extend public.users table with approval columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS requested_role TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;

-- Ensure existing active users remain approved
UPDATE public.users 
SET approval_status = 'approved' 
WHERE approval_status IS NULL OR (is_active = true AND approval_status = 'pending');

-- Ensure DEFAULT_ADMIN_EMAIL (Kendell Pierre) is always super_admin and approved
UPDATE public.users 
SET role = 'super_admin', is_active = true, approval_status = 'approved' 
WHERE LOWER(email) = 'kpierre24@gmail.com';

-- 2. Create public.user_approval_requests table
CREATE TABLE IF NOT EXISTS public.user_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('super_admin', 'superadmin', 'admin', 'teacher', 'student')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  details JSONB DEFAULT '{}'::jsonb,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_role TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_user_approval_requests_email ON public.user_approval_requests(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_user_approval_requests_status ON public.user_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_approval_requests_user_id ON public.user_approval_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_approval_requests_created ON public.user_approval_requests(created_at DESC);

-- 3. Stored Procedure: public.approve_user()
-- Easily callable directly in Supabase SQL editor:
-- SELECT public.approve_user('user@example.com', 'teacher');
CREATE OR REPLACE FUNCTION public.approve_user(
  target_identifier TEXT,
  role_override TEXT DEFAULT NULL,
  approver_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_req RECORD;
  v_user RECORD;
  v_role TEXT;
  v_target_email TEXT;
  v_user_id UUID;
  v_student_id UUID;
BEGIN
  -- Normalize identifier (email or UUID)
  v_target_email := LOWER(TRIM(target_identifier));
  
  -- Find approval request if exists
  SELECT * INTO v_req FROM public.user_approval_requests 
  WHERE LOWER(email) = v_target_email OR id::TEXT = target_identifier OR user_id::TEXT = target_identifier
  LIMIT 1;

  -- Determine target email
  IF v_req.email IS NOT NULL THEN
    v_target_email := LOWER(TRIM(v_req.email));
  END IF;

  -- Resolve granted role (normalize superadmin -> super_admin)
  v_role := COALESCE(role_override, v_req.approved_role, v_req.requested_role, 'student');
  v_role := LOWER(TRIM(v_role));
  IF v_role = 'superadmin' THEN v_role := 'super_admin'; END IF;
  IF v_role NOT IN ('super_admin', 'admin', 'teacher', 'student') THEN
    v_role := 'student';
  END IF;

  -- 1. Update public.user_approval_requests
  IF v_req.id IS NOT NULL THEN
    UPDATE public.user_approval_requests
    SET status = 'approved',
        approved_role = v_role,
        approved_at = NOW(),
        approved_by = approver_id,
        rejection_reason = NULL,
        updated_at = NOW()
    WHERE id = v_req.id;
  ELSE
    -- Insert approved request record if none existed
    INSERT INTO public.user_approval_requests (
      email, name, requested_role, status, approved_role, approved_at, approved_by
    ) VALUES (
      v_target_email, COALESCE(SPLIT_PART(v_target_email, '@', 1), 'User'), v_role, 'approved', v_role, NOW(), approver_id
    ) ON CONFLICT (email) DO UPDATE SET
      status = 'approved',
      approved_role = v_role,
      approved_at = NOW(),
      approved_by = approver_id,
      rejection_reason = NULL,
      updated_at = NOW();
  END IF;

  -- 2. Upsert/Update public.users
  SELECT * INTO v_user FROM public.users WHERE LOWER(email) = v_target_email LIMIT 1;
  
  IF v_user.id IS NOT NULL THEN
    v_user_id := v_user.id;
    UPDATE public.users
    SET is_active = true,
        role = v_role,
        approval_status = 'approved',
        rejection_reason = NULL,
        updated_at = NOW()
    WHERE id = v_user.id;
  ELSE
    INSERT INTO public.users (email, role, is_active, approval_status)
    VALUES (v_target_email, v_role, true, 'approved')
    RETURNING id INTO v_user_id;
  END IF;

  -- 3. If Student role: Link or create students table entry
  IF v_role = 'student' AND v_user_id IS NOT NULL THEN
    SELECT id INTO v_student_id FROM public.students WHERE user_id = v_user_id LIMIT 1;
    IF v_student_id IS NULL THEN
      -- Try matching by email or student_number
      SELECT id INTO v_student_id FROM public.students 
      WHERE (LOWER(student_number) = v_target_email OR LOWER(student_name) ILIKE SPLIT_PART(v_target_email, '@', 1))
        AND user_id IS NULL
      LIMIT 1;

      IF v_student_id IS NOT NULL THEN
        UPDATE public.students SET user_id = v_user_id WHERE id = v_student_id;
      ELSE
        -- Auto-provision basic student record
        INSERT INTO public.students (
          user_id,
          student_number,
          enrollment_status,
          cohort_level,
          admission_date
        ) VALUES (
          v_user_id,
          'HTEIM-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0'),
          'active',
          'Level 1 Foundation',
          CURRENT_DATE
        ) ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  -- 4. Sync auth.users metadata if auth table exists
  BEGIN
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
      'role', v_role,
      'approved', true,
      'approval_status', 'approved'
    )
    WHERE LOWER(email) = v_target_email;
  EXCEPTION WHEN OTHERS THEN
    -- auth schema might be restricted in some execution contexts
    NULL;
  END;

  -- 5. Audit Log
  BEGIN
    INSERT INTO public.audit_history (
      actor_user_id, actor_role, action, entity_type, entity_id, new_values, reason
    ) VALUES (
      approver_id::TEXT, 'admin', 'user_account_approved', 'user_approval_requests', v_user_id::TEXT,
      jsonb_build_object('email', v_target_email, 'role', v_role, 'status', 'approved'),
      'Account approved via Supabase approval workflow'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'email', v_target_email,
    'userId', v_user_id,
    'role', v_role,
    'status', 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Stored Procedure: public.reject_user()
-- Easily callable in Supabase SQL editor:
-- SELECT public.reject_user('user@example.com', 'Invalid credentials');
CREATE OR REPLACE FUNCTION public.reject_user(
  target_identifier TEXT,
  reason_text TEXT DEFAULT 'Request declined by administrator'
)
RETURNS JSONB AS $$
DECLARE
  v_target_email TEXT;
  v_req RECORD;
BEGIN
  v_target_email := LOWER(TRIM(target_identifier));

  -- Check if request exists
  SELECT * INTO v_req FROM public.user_approval_requests 
  WHERE LOWER(email) = v_target_email OR id::TEXT = target_identifier OR user_id::TEXT = target_identifier
  LIMIT 1;

  IF v_req.email IS NOT NULL THEN
    v_target_email := LOWER(TRIM(v_req.email));
  END IF;

  -- 1. Update public.user_approval_requests
  UPDATE public.user_approval_requests
  SET status = 'rejected',
      rejection_reason = reason_text,
      updated_at = NOW()
  WHERE LOWER(email) = v_target_email;

  -- 2. Update public.users
  UPDATE public.users
  SET approval_status = 'rejected',
      is_active = false,
      rejection_reason = reason_text,
      updated_at = NOW()
  WHERE LOWER(email) = v_target_email;

  -- 3. Sync auth.users
  BEGIN
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
      'approved', false,
      'approval_status', 'rejected',
      'rejection_reason', reason_text
    )
    WHERE LOWER(email) = v_target_email;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'email', v_target_email,
    'status', 'rejected',
    'reason', reason_text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Trigger on public.user_approval_requests:
-- When an admin edits the row directly in the Supabase Table Editor and changes status to 'approved',
-- this trigger automatically activates the account and updates roles!
CREATE OR REPLACE FUNCTION public.trg_fn_user_approval_request_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If status was changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    NEW.approved_at := COALESCE(NEW.approved_at, NOW());
    NEW.approved_role := COALESCE(NEW.approved_role, NEW.requested_role);
    
    -- Sync public.users
    UPDATE public.users
    SET is_active = true,
        approval_status = 'approved',
        role = NEW.approved_role,
        updated_at = NOW()
    WHERE LOWER(email) = LOWER(NEW.email);

    -- Sync auth.users metadata
    BEGIN
      UPDATE auth.users
      SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
        'role', NEW.approved_role,
        'approved', true,
        'approval_status', 'approved'
      )
      WHERE LOWER(email) = LOWER(NEW.email);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- If status was changed to 'rejected'
  IF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    UPDATE public.users
    SET is_active = false,
        approval_status = 'rejected',
        rejection_reason = NEW.rejection_reason,
        updated_at = NOW()
    WHERE LOWER(email) = LOWER(NEW.email);

    BEGIN
      UPDATE auth.users
      SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
        'approved', false,
        'approval_status', 'rejected'
      )
      WHERE LOWER(email) = LOWER(NEW.email);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_user_approval_requests_update ON public.user_approval_requests;
CREATE TRIGGER trg_user_approval_requests_update
BEFORE UPDATE ON public.user_approval_requests
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_user_approval_request_update();


-- 6. Row Level Security on public.user_approval_requests
ALTER TABLE public.user_approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approval_requests_select_policy" ON public.user_approval_requests;
DROP POLICY IF EXISTS "approval_requests_insert_policy" ON public.user_approval_requests;
DROP POLICY IF EXISTS "approval_requests_update_policy" ON public.user_approval_requests;
DROP POLICY IF EXISTS "approval_requests_delete_policy" ON public.user_approval_requests;

-- Select: Admins/Staff view all, users can view their own
CREATE POLICY "approval_requests_select_policy" ON public.user_approval_requests
  FOR SELECT TO authenticated
  USING (
    public.is_staff()
    OR LOWER(email) = LOWER(auth.jwt() ->> 'email')
    OR user_id = auth.uid()
  );

-- Insert: Anyone can register an approval request (app sign-up)
CREATE POLICY "approval_requests_insert_policy" ON public.user_approval_requests
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

-- Update: Only Staff & Administrators can update approval requests
CREATE POLICY "approval_requests_update_policy" ON public.user_approval_requests
  FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Delete: Only Administrators can delete requests
CREATE POLICY "approval_requests_delete_policy" ON public.user_approval_requests
  FOR DELETE TO authenticated
  USING (public.is_admin());
