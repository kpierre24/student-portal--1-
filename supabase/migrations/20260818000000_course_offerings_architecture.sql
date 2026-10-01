-- ============================================================================
-- COURSE DEFINITIONS & COURSE OFFERINGS ARCHITECTURE MIGRATION
-- HTEIM School of Ministry
-- ============================================================================
-- Implements the architectural separation:
-- Course (Reusable definition) vs Course Offering (Term delivery instance)
-- Structure:
-- Academic Year
--    └── Semester / Term
--         └── Course (Master catalog definition)
--              └── Course Offering (Scheduled delivery instance)
--                   ├── Lecturer
--                   ├── Enrolled Students
--                   ├── Attendance
--                   ├── Assignments
--                   ├── Exams
--                   └── Grades
-- ============================================================================

-- 1. Master Course Definitions Table (The Reusable Catalog)
CREATE TABLE IF NOT EXISTS public.course_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- e.g. 'SOM-101'
  title TEXT NOT NULL,       -- e.g. 'Biblical Hermeneutics & Exegesis'
  core_module_number INTEGER CHECK (core_module_number BETWEEN 1 AND 6),
  credits NUMERIC(4, 2) NOT NULL DEFAULT 5.00 CHECK (credits >= 0),
  department TEXT NOT NULL DEFAULT 'Biblical Studies',
  level TEXT NOT NULL DEFAULT 'Foundation',
  description TEXT,
  learning_outcomes JSONB DEFAULT '[]'::jsonb,
  prerequisites JSONB DEFAULT '[]'::jsonb,
  syllabus_outline JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_course_definitions_code ON public.course_definitions (code);
CREATE INDEX IF NOT EXISTS idx_course_definitions_module ON public.course_definitions (core_module_number);
CREATE INDEX IF NOT EXISTS idx_course_definitions_dept ON public.course_definitions (department);

-- 2. Course Offerings Table (The Scheduled Delivery Instance)
CREATE TABLE IF NOT EXISTS public.course_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_definition_id UUID NOT NULL REFERENCES public.course_definitions(id) ON DELETE RESTRICT,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  lecturer_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  lecturer_name TEXT NOT NULL,
  lecturer_title TEXT,
  lecturer_email TEXT,
  section TEXT NOT NULL DEFAULT 'Section 01',
  schedule_days TEXT,
  location TEXT,
  zoom_link TEXT,
  capacity INTEGER NOT NULL DEFAULT 40 CHECK (capacity > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('upcoming', 'active', 'grading', 'concluded')),
  credits NUMERIC(4, 2) NOT NULL DEFAULT 5.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unique_course_offering_section_per_term UNIQUE (term_id, course_definition_id, section)
);

CREATE INDEX IF NOT EXISTS idx_course_offerings_def ON public.course_offerings (course_definition_id);
CREATE INDEX IF NOT EXISTS idx_course_offerings_term ON public.course_offerings (term_id);
CREATE INDEX IF NOT EXISTS idx_course_offerings_year ON public.course_offerings (academic_year_id);
CREATE INDEX IF NOT EXISTS idx_course_offerings_status ON public.course_offerings (status);

-- 3. Offering Enrollments Table
CREATE TABLE IF NOT EXISTS public.course_offering_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_offering_id UUID NOT NULL REFERENCES public.course_offerings(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'auditing', 'completed', 'at_risk', 'withdrawn')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attendance_rate NUMERIC(5, 2) DEFAULT 100.00,
  final_grade NUMERIC(5, 2),
  letter_grade TEXT CHECK (letter_grade IN ('A', 'B', 'C', 'D', 'F')),
  standing TEXT NOT NULL DEFAULT 'satisfactory' CHECK (standing IN ('high_distinction', 'satisfactory', 'at_risk')),
  faculty_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_student_per_offering UNIQUE (course_offering_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_offering_enrollments_offering ON public.course_offering_enrollments (course_offering_id);
CREATE INDEX IF NOT EXISTS idx_offering_enrollments_student ON public.course_offering_enrollments (student_id);
CREATE INDEX IF NOT EXISTS idx_offering_enrollments_standing ON public.course_offering_enrollments (standing);

-- 4. Seed the 6 Core Master Curriculum Courses
INSERT INTO public.course_definitions (code, title, core_module_number, credits, department, level, description)
VALUES 
  ('SOM-101', 'Biblical Hermeneutics & Exegesis', 1, 5.00, 'Biblical Studies', 'Foundation', 'Sound biblical interpretation, exegesis methodologies, historical-grammatical context, and delivering scriptural truth without doctrinal distortion.'),
  ('SOM-102', 'Evangelism & The Great Commission', 2, 5.00, 'Practical Ministry', 'Foundation', 'Practical soul-winning strategies, personal witnessing, the Matthew 28 mandate, street ministry, and follow-up discipleship.'),
  ('SOM-103', 'Ministerial Ethics & Pastoral Integrity', 3, 5.00, 'Theology & Ethics', 'Diploma', 'High standards of character, financial integrity, church accountability, conflict resolution, confidentiality, and biblical servant leadership.'),
  ('SOM-104', 'Apostolic Governance & Five-Fold Ministry', 4, 5.00, 'Leadership & Governance', 'Degree', 'Understanding the apostolic mandate, five-fold governance, spiritual authority according to Ephesians 4:11, and distinguishing true vs false apostolic marks.'),
  ('SOM-105', 'Prophetic Ministry & Spiritual Discernment', 5, 5.00, 'Practical Ministry', 'Degree', 'The operation and biblical testing of prophecy, cultivating spiritual sensitivity, dream interpretation, and prophetic order according to 1 Cor 14.'),
  ('SOM-106', 'School of the Pastors and Teachers', 6, 5.00, 'Practical Ministry', 'Executive', 'Shepherding the flock, pastoral counseling, expository sermon preparation, sound biblical teaching, and nurturing believers unto maturity.')
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  core_module_number = EXCLUDED.core_module_number,
  description = EXCLUDED.description;
