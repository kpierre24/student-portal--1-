-- ============================================================================
-- IMMUTABLE IDENTITY MAPPING: FIREBASE UID -> INTERNAL USER ID
-- HTEIM School of Ministry
-- ============================================================================
-- Decouples primary user authentication and authorization from mutable email
-- strings by establishing an immutable mapping between external provider UIDs
-- (e.g. Firebase) and internal PostgreSQL user UUIDs.
-- ============================================================================

-- 1. Add immutable firebase_uid to public.users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'firebase_uid'
  ) THEN
    ALTER TABLE public.users ADD COLUMN firebase_uid TEXT UNIQUE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid
  ON public.users (firebase_uid)
  WHERE firebase_uid IS NOT NULL;

-- 2. Multi-identity mapping table for institutional and external provider identities
CREATE TABLE IF NOT EXISTS public.user_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'firebase',
  provider_uid TEXT NOT NULL,
  email TEXT,
  identity_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_provider_identity UNIQUE (provider, provider_uid)
);

CREATE INDEX IF NOT EXISTS idx_user_identities_user_id
  ON public.user_identities (user_id);

CREATE INDEX IF NOT EXISTS idx_user_identities_provider_uid
  ON public.user_identities (provider, provider_uid);

-- 3. Row Level Security for user_identities
ALTER TABLE public.user_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role full access to user_identities" ON public.user_identities;
CREATE POLICY "Allow service role full access to user_identities"
  ON public.user_identities
  FOR ALL
  USING (true)
  WITH CHECK (true);
