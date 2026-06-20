-- Migration: LMS Assignment Submissions
-- File: supabase/migrations/20260701000000_lms_assignment_submissions.sql

CREATE TABLE IF NOT EXISTS public.lms_assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  text_submission TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  grade_status TEXT DEFAULT 'pending' CHECK (grade_status IN ('pending', 'passed', 'failed')),
  feedback_comments TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  graded_at TIMESTAMPTZ,
  graded_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(contact_id, lesson_id)
);

-- Enable Row Level Security
ALTER TABLE public.lms_assignment_submissions ENABLE ROW LEVEL SECURITY;

-- 1. Workspace members (admins/instructors) can perform all actions
CREATE POLICY "workspace members manage assignment submissions"
  ON public.lms_assignment_submissions FOR ALL
  TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- 2. Students can view their own submissions
CREATE POLICY "students read own assignment submissions"
  ON public.lms_assignment_submissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.contacts
    WHERE contacts.id = lms_assignment_submissions.contact_id
    AND contacts.email = auth.jwt() ->> 'email'
  ));

-- 3. Students can insert their own submissions
CREATE POLICY "students insert own assignment submissions"
  ON public.lms_assignment_submissions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contacts
    WHERE contacts.id = lms_assignment_submissions.contact_id
    AND contacts.email = auth.jwt() ->> 'email'
  ));

-- 4. Students can update their own submissions (e.g. resubmitting or editing)
CREATE POLICY "students update own assignment submissions"
  ON public.lms_assignment_submissions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.contacts
    WHERE contacts.id = lms_assignment_submissions.contact_id
    AND contacts.email = auth.jwt() ->> 'email'
  ));
