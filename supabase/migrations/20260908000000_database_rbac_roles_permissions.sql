-- ============================================================================
-- DATABASE-DRIVEN RBAC: ROLES & PERMISSIONS MIGRATION
-- HTEIM School of Ministry
-- ============================================================================
-- Establishes database tables for roles and granular permissions, eliminates
-- hardcoded email privilege checks, and links user authorization to the database.
-- ============================================================================

-- 1. Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  badge TEXT NOT NULL,
  description TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'text-blue-700 dark:text-blue-300',
  badge_bg TEXT NOT NULL DEFAULT 'bg-blue-100 dark:bg-blue-950/40',
  accessible_tabs TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Role Permissions Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id TEXT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_role_permission UNIQUE (role_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON public.role_permissions(permission);

-- 3. Seed Standard System Roles
INSERT INTO public.roles (id, title, badge, description, color, badge_bg, accessible_tabs)
VALUES
  (
    'super_admin',
    'Executive Administrator',
    'Super Admin',
    'Unrestricted operational and architectural governance across the portal.',
    'text-red-700 dark:text-red-300',
    'bg-red-100 dark:bg-red-950/40',
    ARRAY['students', 'attendance', 'assignments', 'grades', 'finance', 'library', 'bible', 'curriculum', 'sessions', 'cohorts', 'audit', 'settings']
  ),
  (
    'admin',
    'School Administrator',
    'Administrator',
    'Full administrative access to academic records, attendance, curriculum, and settings.',
    'text-purple-700 dark:text-purple-300',
    'bg-purple-100 dark:bg-purple-950/40',
    ARRAY['students', 'attendance', 'assignments', 'grades', 'finance', 'library', 'bible', 'curriculum', 'sessions', 'cohorts', 'audit', 'settings']
  ),
  (
    'teacher',
    'Faculty Instructor',
    'Faculty / Instructor',
    'Curriculum instruction, assignment grading, attendance logging, and academic evaluation.',
    'text-emerald-700 dark:text-emerald-300',
    'bg-emerald-100 dark:bg-emerald-950/40',
    ARRAY['students', 'attendance', 'assignments', 'grades', 'library', 'bible', 'curriculum', 'sessions']
  ),
  (
    'ta',
    'Teaching Assistant',
    'Teaching Assistant',
    'Assists instructors with grading submissions, logging attendance, and student support.',
    'text-teal-700 dark:text-teal-300',
    'bg-teal-100 dark:bg-teal-950/40',
    ARRAY['students', 'attendance', 'assignments', 'grades', 'library', 'bible']
  ),
  (
    'finance_officer',
    'Bursar & Finance Officer',
    'Finance Officer',
    'Tuition fee management, invoice generation, payment processing, and financial reporting.',
    'text-amber-700 dark:text-amber-300',
    'bg-amber-100 dark:bg-amber-950/40',
    ARRAY['students', 'finance', 'audit']
  ),
  (
    'registrar',
    'Academic Registrar',
    'Registrar',
    'Student admissions, cohort management, transcript generation, and enrollment status.',
    'text-indigo-700 dark:text-indigo-300',
    'bg-indigo-100 dark:bg-indigo-950/40',
    ARRAY['students', 'attendance', 'grades', 'cohorts', 'audit']
  ),
  (
    'student',
    'Enrolled Student',
    'Student',
    'Access personal coursework, assignment submissions, grades, attendance, and library.',
    'text-blue-700 dark:text-blue-300',
    'bg-blue-100 dark:bg-blue-950/40',
    ARRAY['students', 'attendance', 'assignments', 'grades', 'finance', 'library', 'bible']
  ),
  (
    'guest',
    'Guest Observer',
    'Guest',
    'Read-only access to public curriculum and open ministry resources.',
    'text-stone-700 dark:text-stone-300',
    'bg-stone-100 dark:bg-stone-950/40',
    ARRAY['library', 'bible']
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  badge = EXCLUDED.badge,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  badge_bg = EXCLUDED.badge_bg,
  accessible_tabs = EXCLUDED.accessible_tabs,
  updated_at = NOW();

-- 4. Seed Granular Permissions for Roles
INSERT INTO public.role_permissions (role_id, permission)
VALUES
  -- super_admin
  ('super_admin', 'all:access'),
  ('super_admin', 'students:read'),
  ('super_admin', 'students:write'),
  ('super_admin', 'attendance:read'),
  ('super_admin', 'attendance:write'),
  ('super_admin', 'attendance:approve'),
  ('super_admin', 'assignments:read'),
  ('super_admin', 'assignments:submit'),
  ('super_admin', 'assignments:grade'),
  ('super_admin', 'grades:read'),
  ('super_admin', 'grades:write'),
  ('super_admin', 'grades:release'),
  ('super_admin', 'finance:read'),
  ('super_admin', 'finance:write'),
  ('super_admin', 'finance:refund'),
  ('super_admin', 'audit:read'),
  ('super_admin', 'users:manage'),
  ('super_admin', 'roles:manage'),

  -- admin
  ('admin', 'students:read'),
  ('admin', 'students:write'),
  ('admin', 'attendance:read'),
  ('admin', 'attendance:write'),
  ('admin', 'attendance:approve'),
  ('admin', 'assignments:read'),
  ('admin', 'assignments:grade'),
  ('admin', 'grades:read'),
  ('admin', 'grades:write'),
  ('admin', 'grades:release'),
  ('admin', 'finance:read'),
  ('admin', 'finance:write'),
  ('admin', 'audit:read'),
  ('admin', 'users:manage'),
  ('admin', 'roles:manage'),

  -- teacher
  ('teacher', 'students:read'),
  ('teacher', 'attendance:read'),
  ('teacher', 'attendance:write'),
  ('teacher', 'attendance:approve'),
  ('teacher', 'assignments:read'),
  ('teacher', 'assignments:grade'),
  ('teacher', 'grades:read'),
  ('teacher', 'grades:write'),
  ('teacher', 'grades:release'),

  -- ta (teaching assistant)
  ('ta', 'students:read'),
  ('ta', 'attendance:read'),
  ('ta', 'attendance:write'),
  ('ta', 'assignments:read'),
  ('ta', 'assignments:grade'),
  ('ta', 'grades:read'),
  ('ta', 'grades:write'),

  -- finance_officer
  ('finance_officer', 'students:read'),
  ('finance_officer', 'finance:read'),
  ('finance_officer', 'finance:write'),
  ('finance_officer', 'finance:refund'),
  ('finance_officer', 'audit:read'),

  -- registrar
  ('registrar', 'students:read'),
  ('registrar', 'students:write'),
  ('registrar', 'attendance:read'),
  ('registrar', 'grades:read'),
  ('registrar', 'grades:release'),
  ('registrar', 'audit:read'),

  -- student
  ('student', 'students:read'),
  ('student', 'attendance:read'),
  ('student', 'assignments:read'),
  ('student', 'assignments:submit'),
  ('student', 'grades:read'),
  ('student', 'finance:read'),

  -- guest
  ('guest', 'students:read')
ON CONFLICT (role_id, permission) DO NOTHING;

-- 5. Alter Users Table Constraint
-- Relax legacy role check to accept all database-defined roles
DO $$
BEGIN
  -- Drop existing users_role_check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_role_check'
      AND table_name = 'users'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_role_check;
  END IF;

  -- Add foreign key reference to public.roles(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_role_fkey'
      AND table_name = 'users'
      AND table_schema = 'public'
  ) THEN
    -- Ensure all existing user roles map to a valid role before adding FK
    UPDATE public.users SET role = 'admin' WHERE role = 'staff';
    UPDATE public.users SET role = 'student' WHERE role NOT IN ('super_admin', 'admin', 'teacher', 'ta', 'finance_officer', 'registrar', 'student', 'guest');
    
    ALTER TABLE public.users
      ADD CONSTRAINT users_role_fkey
      FOREIGN KEY (role) REFERENCES public.roles(id)
      ON UPDATE CASCADE;
  END IF;
END $$;

-- 6. Enable Row Level Security & Policies for Roles and Permissions
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read roles" ON public.roles;
DROP POLICY IF EXISTS "Allow authenticated read role_permissions" ON public.role_permissions;

CREATE POLICY "Allow authenticated read roles" ON public.roles
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated read role_permissions" ON public.role_permissions
  FOR SELECT USING (true);
