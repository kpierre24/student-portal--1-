-- ============================================================================
-- OPTIMIZE LECTURER COURSE OFFERING AUTHORIZATION INDEXES
-- HTEIM School of Ministry
-- ============================================================================
-- Adds composite index for fast, targeted lecturer authorization queries:
-- SELECT 1 FROM course_offerings WHERE lecturer_user_id = ? AND course_definition_id = ?
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_course_offerings_lecturer_course_def
  ON public.course_offerings (lecturer_user_id, course_definition_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_course_offerings_lecturer_email_course_def
  ON public.course_offerings (lecturer_email, course_definition_id)
  WHERE deleted_at IS NULL;
