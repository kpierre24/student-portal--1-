-- ============================================================================
-- REBUILD AUTHORITATIVE AUDIT SYSTEM MIGRATION
-- HTEIM School of Ministry
-- ============================================================================
-- Rebuilds the authoritative audit_history table with all required fields:
-- audit_id, actor_user_id, actor_role, action, entity_type, entity_id,
-- old_values, new_values, changed_fields, reason, ip_address, user_agent,
-- request_id, timestamp.
-- Ensures actor_user_id (UUID) is actually stored and indexed.
-- ============================================================================

-- 1. Create or Rebuild audit_history Table
CREATE TABLE IF NOT EXISTS public.audit_history (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL DEFAULT 'system',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_values JSONB DEFAULT NULL,
  new_values JSONB DEFAULT NULL,
  changed_fields JSONB DEFAULT '[]'::jsonb,
  reason TEXT DEFAULT NULL,
  ip_address TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  request_id TEXT DEFAULT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Schema Evolution / Column Verification for existing instances
DO $$
BEGIN
  -- Ensure audit_id exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_history' AND column_name = 'audit_id'
  ) THEN
    ALTER TABLE public.audit_history ADD COLUMN audit_id UUID DEFAULT gen_random_uuid();
    -- If legacy id exists, backfill audit_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'audit_history' AND column_name = 'id'
    ) THEN
      UPDATE public.audit_history SET audit_id = id WHERE audit_id IS NULL;
    END IF;
  END IF;

  -- Ensure actor_user_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_history' AND column_name = 'actor_user_id'
  ) THEN
    ALTER TABLE public.audit_history ADD COLUMN actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  -- Ensure actor_role exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_history' AND column_name = 'actor_role'
  ) THEN
    ALTER TABLE public.audit_history ADD COLUMN actor_role TEXT NOT NULL DEFAULT 'system';
  END IF;

  -- Ensure changed_fields exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_history' AND column_name = 'changed_fields'
  ) THEN
    ALTER TABLE public.audit_history ADD COLUMN changed_fields JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Ensure reason exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_history' AND column_name = 'reason'
  ) THEN
    ALTER TABLE public.audit_history ADD COLUMN reason TEXT DEFAULT NULL;
  END IF;

  -- Ensure request_id exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_history' AND column_name = 'request_id'
  ) THEN
    ALTER TABLE public.audit_history ADD COLUMN request_id TEXT DEFAULT NULL;
  END IF;

  -- Ensure ip_address exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_history' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE public.audit_history ADD COLUMN ip_address TEXT DEFAULT NULL;
  END IF;

  -- Ensure user_agent exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_history' AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE public.audit_history ADD COLUMN user_agent TEXT DEFAULT NULL;
  END IF;

  -- Ensure old_values exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_history' AND column_name = 'old_values'
  ) THEN
    ALTER TABLE public.audit_history ADD COLUMN old_values JSONB DEFAULT NULL;
  END IF;

  -- Ensure new_values exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_history' AND column_name = 'new_values'
  ) THEN
    ALTER TABLE public.audit_history ADD COLUMN new_values JSONB DEFAULT NULL;
  END IF;

  -- Remove any overly restrictive check constraints on action
  ALTER TABLE public.audit_history DROP CONSTRAINT IF EXISTS audit_history_action_check;
END $$;

-- 3. Indexes for fast audit queries, tracing, and actor investigations
CREATE INDEX IF NOT EXISTS idx_audit_history_audit_id ON public.audit_history (audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_history_actor_user_id ON public.audit_history (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_history_actor_role ON public.audit_history (actor_role);
CREATE INDEX IF NOT EXISTS idx_audit_history_entity ON public.audit_history (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_history_action ON public.audit_history (action);
CREATE INDEX IF NOT EXISTS idx_audit_history_timestamp ON public.audit_history (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_history_request_id ON public.audit_history (request_id);

-- 4. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.audit_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read audit history" ON public.audit_history;
CREATE POLICY "Staff can read audit history"
  ON public.audit_history
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('super_admin', 'admin', 'registrar', 'finance_officer')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'registrar', 'finance_officer')
  );

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_history;
CREATE POLICY "System can insert audit logs"
  ON public.audit_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
