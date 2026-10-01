CREATE TABLE IF NOT EXISTS public.quiz_submissions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  quiz_title TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT,
  student_id UUID,
  score NUMERIC(5,2) DEFAULT 0,
  total_possible NUMERIC(5,2) DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0,
  responses JSONB DEFAULT '{}'::jsonb,
  time_spent_seconds INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz_id ON public.quiz_submissions (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student_name ON public.quiz_submissions (student_name);
