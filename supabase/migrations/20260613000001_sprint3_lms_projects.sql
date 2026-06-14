-- Migration: Sprint 3 - LMS & Projects Enhancements
-- File: supabase/migrations/20260613000001_sprint3_lms_projects.sql

-- 1. Alter public.projects for Gantt timelines, metadata, and visibility settings
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget NUMERIC DEFAULT NULL;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS cost NUMERIC DEFAULT NULL;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tracked_hours NUMERIC DEFAULT NULL;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_settings JSONB DEFAULT '{"show_tasks": true, "show_employee_names": false, "show_financials": false}'::jsonb;

-- 1.1 Alter public.workspaces for workspace-level project visibility defaults
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS project_settings JSONB DEFAULT '{"show_tasks": true, "show_employee_names": false, "show_financials": false}'::jsonb;

-- 2. Alter public.project_tasks for milestones and client verification confirmations
ALTER TABLE public.project_tasks ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT FALSE;
ALTER TABLE public.project_tasks ADD COLUMN IF NOT EXISTS client_approved_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.project_tasks ADD COLUMN IF NOT EXISTS approved_by_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- 3. Alter public.enrollments for LMS State Restores
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS last_lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE SET NULL;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS last_position_seconds INTEGER DEFAULT 0;

-- 4. Alter public.media_files for client-facing deliverables
ALTER TABLE public.media_files ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.media_files ADD COLUMN IF NOT EXISTS is_client_deliverable BOOLEAN DEFAULT FALSE;

-- Ensure clients can view deliverables linked to their projects
DROP POLICY IF EXISTS "clients view own project media files" ON public.media_files;
CREATE POLICY "clients view own project media files" ON public.media_files
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE contact_id IN (
        SELECT id FROM public.contacts WHERE email = auth.jwt() ->> 'email'
      )
    ) AND is_client_deliverable = TRUE
  );
