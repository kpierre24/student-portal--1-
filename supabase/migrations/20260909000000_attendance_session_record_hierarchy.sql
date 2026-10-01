-- ============================================================================
-- ATTENDANCE HIERARCHY & TRANSACTIONAL UPSERT MIGRATION
-- HTEIM School of Ministry Portal
-- Hierarchy: attendance_session -> attendance_record -> student_id
-- Status Enum: PRESENT, ABSENT, LATE, EXCUSED (prohibits arbitrary strings)
-- Batch Attendance: UPSERT attendance_record inside an atomic transaction
-- ============================================================================

-- 0. Ensure cohorts lookup table exists to prevent SQLSTATE 42P01
CREATE TABLE IF NOT EXISTS public.cohorts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  academic_year INTEGER NOT NULL DEFAULT 2026,
  term TEXT,
  start_date DATE,
  end_date DATE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  sheet_url TEXT,
  sheet_tab_pattern TEXT,
  theme_color TEXT DEFAULT 'indigo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default cohorts if newly created
INSERT INTO public.cohorts (id, name, academic_year, term, start_date, end_date, is_archived, is_current, description, theme_color, sheet_tab_pattern)
VALUES 
  ('cohort_2026', 'Class of 2026', 2026, 'Spring 2026 • Term 2', '2026-01-10', '2026-12-15', FALSE, TRUE, 'Current active ministerial diploma & certificate cohort (Foundation to Executive Leadership).', 'indigo', '2026'),
  ('cohort_2027', 'Class of 2027', 2027, 'Fall 2026 / Spring 2027', '2027-01-09', '2027-12-14', FALSE, FALSE, 'Upcoming academic year cohort for prospective & enrolled ministry students.', 'emerald', '2027')
ON CONFLICT (id) DO NOTHING;

-- 1. Create attendance_sessions table
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  cohort_id TEXT, -- Flexible cohort identifier (e.g. 'cohort_2026', 'cohort_2027') without hard table dependency
  session_date DATE NOT NULL,
  title TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unique_session_date_course UNIQUE (session_date, course_id)
);

-- Defensively ensure cohort_id column exists if table was created previously
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_sessions') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance_sessions' AND column_name = 'cohort_id') THEN
      ALTER TABLE public.attendance_sessions ADD COLUMN cohort_id TEXT;
    END IF;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON public.attendance_sessions (session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_course ON public.attendance_sessions (course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_cohort ON public.attendance_sessions (cohort_id);

-- 2. Create attendance_records table (Hierarchy: session -> record -> student_id)
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')),
  notes TEXT,
  manual_override BOOLEAN DEFAULT FALSE,
  locked BOOLEAN DEFAULT FALSE,
  recorded_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unique_session_student_record UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records (session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.attendance_records (student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON public.attendance_records (status);

-- 3. Stored Procedure for Atomic Batch Attendance Upsert Inside a Transaction
-- Eliminates the destructive delete-and-insert approach.
-- Uses: UPSERT attendance_record inside a single atomic transaction.
CREATE OR REPLACE FUNCTION public.upsert_batch_attendance_records(
  p_session_date DATE,
  p_course_id UUID,
  p_session_title TEXT,
  p_records JSONB,
  p_actor_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_rec JSONB;
  v_student_id UUID;
  v_status TEXT;
  v_notes TEXT;
  v_upserted_count INT := 0;
BEGIN
  -- Validate date
  IF p_session_date IS NULL THEN
    RAISE EXCEPTION 'session_date is required for batch attendance';
  END IF;

  -- 1. Ensure attendance_session exists inside this transaction
  IF p_course_id IS NOT NULL THEN
    SELECT id INTO v_session_id
    FROM public.attendance_sessions
    WHERE session_date = p_session_date AND course_id = p_course_id AND deleted_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1;
  ELSE
    SELECT id INTO v_session_id
    FROM public.attendance_sessions
    WHERE session_date = p_session_date AND course_id IS NULL AND deleted_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_session_id IS NULL THEN
    INSERT INTO public.attendance_sessions (
      session_date,
      course_id,
      title,
      updated_at
    )
    VALUES (
      p_session_date,
      p_course_id,
      COALESCE(p_session_title, 'Class Session'),
      NOW()
    )
    RETURNING id INTO v_session_id;
  ELSE
    UPDATE public.attendance_sessions
    SET title = COALESCE(p_session_title, title),
        updated_at = NOW()
    WHERE id = v_session_id;
  END IF;

  -- 2. Process and UPSERT each attendance_record
  -- This preserves existing records for other students in this session without deleting
  FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    v_student_id := (v_rec->>'student_id')::UUID;
    v_status := UPPER(TRIM(v_rec->>'status'));
    v_notes := v_rec->>'notes';

    -- Strict validation: Only PRESENT, ABSENT, LATE, EXCUSED allowed
    IF v_status NOT IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED') THEN
      RAISE EXCEPTION 'Invalid attendance status "%". Allowed values: PRESENT, ABSENT, LATE, EXCUSED', v_status;
    END IF;

    IF v_student_id IS NOT NULL THEN
      -- Atomic UPSERT into attendance_records
      INSERT INTO public.attendance_records (
        session_id,
        student_id,
        status,
        notes,
        manual_override,
        recorded_by_user_id,
        updated_at
      )
      VALUES (
        v_session_id,
        v_student_id,
        v_status,
        v_notes,
        COALESCE((v_rec->>'manual_override')::BOOLEAN, FALSE),
        p_actor_user_id,
        NOW()
      )
      ON CONFLICT (session_id, student_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        notes = COALESCE(EXCLUDED.notes, public.attendance_records.notes),
        manual_override = EXCLUDED.manual_override,
        recorded_by_user_id = EXCLUDED.recorded_by_user_id,
        updated_at = NOW();

      v_upserted_count := v_upserted_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session_id,
    'session_date', p_session_date,
    'upserted_count', v_upserted_count
  );
END;
$$;

-- 4. Single Record UPSERT Transaction Helper
CREATE OR REPLACE FUNCTION public.upsert_single_attendance_record(
  p_session_date DATE,
  p_course_id UUID,
  p_session_title TEXT,
  p_student_id UUID,
  p_status TEXT,
  p_notes TEXT,
  p_manual_override BOOLEAN,
  p_actor_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_status TEXT;
  v_record_id UUID;
BEGIN
  v_status := UPPER(TRIM(p_status));
  IF v_status NOT IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED') THEN
    RAISE EXCEPTION 'Invalid attendance status "%". Allowed values: PRESENT, ABSENT, LATE, EXCUSED', v_status;
  END IF;

  -- 1. Ensure attendance_session exists
  IF p_course_id IS NOT NULL THEN
    SELECT id INTO v_session_id
    FROM public.attendance_sessions
    WHERE session_date = p_session_date AND course_id = p_course_id AND deleted_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1;
  ELSE
    SELECT id INTO v_session_id
    FROM public.attendance_sessions
    WHERE session_date = p_session_date AND course_id IS NULL AND deleted_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_session_id IS NULL THEN
    INSERT INTO public.attendance_sessions (
      session_date,
      course_id,
      title,
      updated_at
    )
    VALUES (
      p_session_date,
      p_course_id,
      COALESCE(p_session_title, 'Class Session'),
      NOW()
    )
    RETURNING id INTO v_session_id;
  ELSE
    UPDATE public.attendance_sessions
    SET title = COALESCE(p_session_title, title),
        updated_at = NOW()
    WHERE id = v_session_id;
  END IF;

  -- 2. Upsert record
  INSERT INTO public.attendance_records (
    session_id,
    student_id,
    status,
    notes,
    manual_override,
    recorded_by_user_id,
    updated_at
  )
  VALUES (
    v_session_id,
    p_student_id,
    v_status,
    p_notes,
    COALESCE(p_manual_override, FALSE),
    p_actor_user_id,
    NOW()
  )
  ON CONFLICT (session_id, student_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    notes = COALESCE(EXCLUDED.notes, public.attendance_records.notes),
    manual_override = EXCLUDED.manual_override,
    recorded_by_user_id = EXCLUDED.recorded_by_user_id,
    updated_at = NOW()
  RETURNING id INTO v_record_id;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session_id,
    'record_id', v_record_id,
    'status', v_status
  );
END;
$$;

-- 5. Migrate legacy records into attendance_sessions and attendance_records if present
DO $$
DECLARE
  r RECORD;
  v_sess_id UUID;
  v_clean_status TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') THEN
    FOR r IN SELECT DISTINCT session_date, course_id FROM public.attendance WHERE deleted_at IS NULL LOOP
      INSERT INTO public.attendance_sessions (session_date, course_id, title)
      VALUES (r.session_date, r.course_id, 'Class Session ' || r.session_date::TEXT)
      ON CONFLICT (session_date, course_id) DO NOTHING;
    END LOOP;

    FOR r IN SELECT a.id, a.session_date, a.course_id, a.student_id, a.status, a.notes, a.recorded_by_user_id, a.created_at, a.updated_at 
             FROM public.attendance a 
             WHERE a.deleted_at IS NULL LOOP
      SELECT id INTO v_sess_id FROM public.attendance_sessions WHERE session_date = r.session_date AND (course_id = r.course_id OR (course_id IS NULL AND r.course_id IS NULL)) LIMIT 1;
      
      IF v_sess_id IS NOT NULL AND r.student_id IS NOT NULL THEN
        -- Clean status into strict enum
        v_clean_status := CASE 
          WHEN LOWER(TRIM(r.status)) IN ('present', 'p', '1', 'attended') THEN 'PRESENT'
          WHEN LOWER(TRIM(r.status)) IN ('late', 'tardy', 't') THEN 'LATE'
          WHEN LOWER(TRIM(r.status)) IN ('excused', 'e') THEN 'EXCUSED'
          ELSE 'ABSENT'
        END;

        INSERT INTO public.attendance_records (
          session_id,
          student_id,
          status,
          notes,
          recorded_by_user_id,
          created_at,
          updated_at
        )
        VALUES (
          v_sess_id,
          r.student_id,
          v_clean_status,
          r.notes,
          r.recorded_by_user_id,
          r.created_at,
          r.updated_at
        )
        ON CONFLICT (session_id, student_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;
END;
$$;
