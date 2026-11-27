-- ============================================================
-- Supabase Schema for កម្មវិធីបង្កើតតេស្ដ (Khmer Test Generator)
-- Run this SQL in your Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Schools Table (ផ្ទាំងកាតសាលា)
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  access_code TEXT NOT NULL,
  principal_code TEXT NOT NULL DEFAULT '1234',
  teacher_code TEXT NOT NULL DEFAULT '1111',
  student_code TEXT NOT NULL DEFAULT '2222',
  google_webhook_url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Subjects Table (មុខវិជ្ជា - អាចបន្ថែមបាន)
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, name)
);

-- 3. Saved Tests Table (ឃ្លាំងរក្សាទុកវិញ្ញាសា)
CREATE TABLE IF NOT EXISTS tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  exam_month TEXT DEFAULT '',
  teacher_name TEXT DEFAULT 'គ្រូបង្រៀន',
  duration INTEGER NOT NULL DEFAULT 60,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  show_score_immediately BOOLEAN NOT NULL DEFAULT TRUE,
  max_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Student Submissions Table (លទ្ធផល និងពិន្ទុសិស្ស)
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  test_title TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  exam_month TEXT DEFAULT '',
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  score NUMERIC(6,2) NOT NULL DEFAULT 0,
  total_points NUMERIC(6,2) NOT NULL DEFAULT 10,
  correct_count INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_tests_school_grade_subject ON tests(school_id, grade, subject);
CREATE INDEX IF NOT EXISTS idx_submissions_school_grade ON submissions(school_id, grade, subject);

-- Enable Row Level Security (RLS) with open anon policies for client-side app
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write schools" ON schools FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write subjects" ON subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write tests" ON tests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write submissions" ON submissions FOR ALL USING (true) WITH CHECK (true);

-- 5. Students Roster Table (បញ្ជីឈ្មោះសិស្ស)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  gender TEXT DEFAULT '',
  grade TEXT NOT NULL,
  school_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_students_school_grade ON students(school_id, grade);
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write students" ON students FOR ALL USING (true) WITH CHECK (true);
