-- Migration: Remedial Assignments, Expert Profiles, Availabilities, and Live Sessions
-- File: supabase/migrations/20260611000004_remedial_and_experts.sql

-- 1. Create lms_remedial_assignments
CREATE TABLE IF NOT EXISTS public.lms_remedial_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  incorrect_attempts_count INTEGER DEFAULT 1,
  methodology_a_text TEXT,
  methodology_b_case_study TEXT,
  methodology_c_analogy TEXT,
  validation_questions JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'passed')),
  restore_progress_percent INTEGER DEFAULT 0,
  restore_video_timestamp INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on lms_remedial_assignments
ALTER TABLE public.lms_remedial_assignments ENABLE ROW LEVEL SECURITY;

-- 2. Create lms_expert_profiles
CREATE TABLE IF NOT EXISTS public.lms_expert_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  languages TEXT[] DEFAULT '{}',
  specializations TEXT[] DEFAULT '{}',
  hourly_rate NUMERIC(10, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on lms_expert_profiles
ALTER TABLE public.lms_expert_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create lms_expert_availabilities
CREATE TABLE IF NOT EXISTS public.lms_expert_availabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID NOT NULL REFERENCES public.lms_expert_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on lms_expert_availabilities
ALTER TABLE public.lms_expert_availabilities ENABLE ROW LEVEL SECURITY;

-- 4. Create lms_expert_sessions
CREATE TABLE IF NOT EXISTS public.lms_expert_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID NOT NULL REFERENCES public.lms_expert_profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  session_type TEXT CHECK (session_type IN ('private', 'group', 'cohort', 'drop_in')),
  is_live BOOLEAN DEFAULT false,
  meeting_url TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on lms_expert_sessions
ALTER TABLE public.lms_expert_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Select Policies for Workspace Members / Student access
DROP POLICY IF EXISTS "Workspace members select experts" ON public.lms_expert_profiles;
CREATE POLICY "Workspace members select experts"
  ON public.lms_expert_profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Workspace members select availabilities" ON public.lms_expert_availabilities;
CREATE POLICY "Workspace members select availabilities"
  ON public.lms_expert_availabilities FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Workspace members select sessions" ON public.lms_expert_sessions;
CREATE POLICY "Workspace members select sessions"
  ON public.lms_expert_sessions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Student select assignments" ON public.lms_remedial_assignments;
CREATE POLICY "Student select assignments"
  ON public.lms_remedial_assignments FOR SELECT
  USING (true);

-- Service Role Policies (bypass constraints for admin insertions/updates)
DROP POLICY IF EXISTS "Service role full access assignments" ON public.lms_remedial_assignments;
CREATE POLICY "Service role full access assignments" ON public.lms_remedial_assignments FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access experts" ON public.lms_expert_profiles;
CREATE POLICY "Service role full access experts" ON public.lms_expert_profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access availabilities" ON public.lms_expert_availabilities;
CREATE POLICY "Service role full access availabilities" ON public.lms_expert_availabilities FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access sessions" ON public.lms_expert_sessions;
CREATE POLICY "Service role full access sessions" ON public.lms_expert_sessions FOR ALL USING (true);
