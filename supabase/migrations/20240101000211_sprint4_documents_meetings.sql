-- Migration: Sprint 4 - Documents & Meet Scheduling Enhancements
-- File: supabase/migrations/20260613000002_sprint4_documents_meetings.sql

-- 1. Alter public.booking_calendars for preset cancellation windows
ALTER TABLE public.booking_calendars ADD COLUMN IF NOT EXISTS cancellation_window_hours INTEGER DEFAULT 24;

-- 2. RLS Select Policy on booking_calendars for client portal access
DROP POLICY IF EXISTS "clients view booking calendars" ON public.booking_calendars;
CREATE POLICY "clients view booking calendars" ON public.booking_calendars
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.contacts WHERE email = auth.jwt() ->> 'email'
    )
  );

-- 3. RLS Select & Update Policies on appointments for client portal scheduling
DROP POLICY IF EXISTS "clients view own appointments" ON public.appointments;
CREATE POLICY "clients view own appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "clients update own appointments" ON public.appointments;
CREATE POLICY "clients update own appointments" ON public.appointments
  FOR UPDATE TO authenticated
  USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    contact_id IN (
      SELECT id FROM public.contacts WHERE email = auth.jwt() ->> 'email'
    )
  );
