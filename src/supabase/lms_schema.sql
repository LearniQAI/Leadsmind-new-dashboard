-- LeadsMind LMS Schema (Based on PRD Section 10)
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  cover_image TEXT,
  color_theme TEXT,
  template_id UUID,
  tutor_id UUID,
  certificate_template_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER DEFAULT 1,
  unlock_type TEXT DEFAULT 'immediate' -- drip_days, drip_date, quiz_gated
);

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_blocks JSONB DEFAULT '[]'::jsonb,
  video_provider TEXT, -- youtube, vimeo, wistia, bunny, aws
  video_ref TEXT
);

CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  timer_seconds INTEGER,
  pass_mark_pct INTEGER DEFAULT 60,
  max_retries INTEGER,
  ai_generated BOOLEAN DEFAULT false,
  questions JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  score_pct NUMERIC,
  passed BOOLEAN,
  attempt_number INTEGER DEFAULT 1,
  locked_out BOOLEAN DEFAULT false
);
