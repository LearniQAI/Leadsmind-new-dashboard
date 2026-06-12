-- Migration: Cohort Session RSVPs, Live Chat, and Recordings
-- File: supabase/migrations/20260611000005_cohort_and_rsvps.sql

-- 1. Create lms_session_rsvps
CREATE TABLE IF NOT EXISTS public.lms_session_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.lms_expert_sessions(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (session_id, contact_id)
);

-- Enable RLS on lms_session_rsvps
ALTER TABLE public.lms_session_rsvps ENABLE ROW LEVEL SECURITY;

-- 2. Create lms_session_chats
CREATE TABLE IF NOT EXISTS public.lms_session_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.lms_expert_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on lms_session_chats
ALTER TABLE public.lms_session_chats ENABLE ROW LEVEL SECURITY;

-- 3. Create lms_session_recordings
CREATE TABLE IF NOT EXISTS public.lms_session_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.lms_expert_sessions(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on lms_session_recordings
ALTER TABLE public.lms_session_recordings ENABLE ROW LEVEL SECURITY;

-- 4. Add use_custom_landing_page column to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS use_custom_landing_page BOOLEAN DEFAULT false;

-- RLS Policies
DROP POLICY IF EXISTS "Public select/insert/delete rsvps" ON public.lms_session_rsvps;
CREATE POLICY "Public select/insert/delete rsvps" ON public.lms_session_rsvps FOR ALL USING (true);

DROP POLICY IF EXISTS "Public select/insert chats" ON public.lms_session_chats;
CREATE POLICY "Public select/insert chats" ON public.lms_session_chats FOR ALL USING (true);

DROP POLICY IF EXISTS "Public select recordings" ON public.lms_session_recordings;
CREATE POLICY "Public select recordings" ON public.lms_session_recordings FOR SELECT USING (true);

-- Service Role Policies (bypass constraints for admin insertions/updates)
DROP POLICY IF EXISTS "Service role full access recordings" ON public.lms_session_recordings;
CREATE POLICY "Service role full access recordings" ON public.lms_session_recordings FOR ALL USING (true);

-- 5. Add reminder sent tracking columns to lms_expert_sessions
ALTER TABLE public.lms_expert_sessions ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT false;
ALTER TABLE public.lms_expert_sessions ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT false;
