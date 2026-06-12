-- Migration: Heartbeat tracking and struggle analytics scores
-- File: supabase/migrations/20260611000003_heartbeat_and_struggle_analytics.sql

-- 1. Alter public.enrollments table for heartbeat & abandonment metrics
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS last_abandonment_email_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create struggle scores table
CREATE TABLE IF NOT EXISTS public.lms_student_struggle_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  quiz_failure_rate_points INTEGER DEFAULT 0,
  score_vector_points INTEGER DEFAULT 0,
  passing_delta_points INTEGER DEFAULT 0,
  time_multiplier_points INTEGER DEFAULT 0,
  dropout_trends_points INTEGER DEFAULT 0,
  reasons JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contact_id, course_id)
);

-- Enable RLS on lms_student_struggle_scores
ALTER TABLE public.lms_student_struggle_scores ENABLE ROW LEVEL SECURITY;

-- Select policies
DROP POLICY IF EXISTS "Workspace members read struggle scores" ON public.lms_student_struggle_scores;
CREATE POLICY "Workspace members read struggle scores" 
  ON public.lms_student_struggle_scores FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = lms_student_struggle_scores.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access struggle scores" ON public.lms_student_struggle_scores;
CREATE POLICY "Service role full access struggle scores"
  ON public.lms_student_struggle_scores FOR ALL
  USING (true);
