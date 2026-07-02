-- Migration: Sprint 5 - Support Tickets, Profile, & POPIA Compliance Enhancements
-- File: supabase/migrations/20260613000003_sprint5_support_profile_popia.sql

-- 1. Alter public.contacts for language, notification preferences, and POPIA deletion flags
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS language TEXT CHECK (language IN ('EN', 'AF', 'ZU', 'XH')) DEFAULT 'EN';
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"billing_email": true, "billing_whatsapp": false, "marketing_email": true, "marketing_whatsapp": false, "support_email": true, "support_whatsapp": true}'::jsonb;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS deletion_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Alter public.support_tickets to support categories and Customer Satisfaction rating values
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('Billing', 'Tech', 'General', 'Complaint')) DEFAULT 'General';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS csat_rating INTEGER CHECK (csat_rating BETWEEN 1 AND 5) DEFAULT NULL;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS csat_feedback TEXT DEFAULT NULL;

-- 3. Create public.email_change_requests table for secure OTP validation links
CREATE TABLE IF NOT EXISTS public.email_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  new_email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on email_change_requests
ALTER TABLE public.email_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access email_change_requests" ON public.email_change_requests FOR ALL USING (true);

-- 4. Enable RLS on support_ticket_messages & ticket_attachments for client portal messaging access
-- Messages Select Policy
DROP POLICY IF EXISTS "clients view own support ticket messages" ON public.support_ticket_messages;
CREATE POLICY "clients view own support ticket messages" ON public.support_ticket_messages
  FOR SELECT TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM public.support_tickets WHERE contact_id IN (
        SELECT id FROM public.contacts WHERE email = auth.jwt() ->> 'email'
      )
    ) AND is_internal_note = FALSE
  );

-- Messages Insert Policy
DROP POLICY IF EXISTS "clients insert own support ticket messages" ON public.support_ticket_messages;
CREATE POLICY "clients insert own support ticket messages" ON public.support_ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM public.support_tickets WHERE contact_id IN (
        SELECT id FROM public.contacts WHERE email = auth.jwt() ->> 'email'
      )
    ) AND is_internal_note = FALSE AND sender_type = 'customer'
  );

-- Attachments Select Policy
DROP POLICY IF EXISTS "clients view own ticket attachments" ON public.ticket_attachments;
CREATE POLICY "clients view own ticket attachments" ON public.ticket_attachments
  FOR SELECT TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM public.support_tickets WHERE contact_id IN (
        SELECT id FROM public.contacts WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

-- Attachments Insert Policy
DROP POLICY IF EXISTS "clients insert own ticket attachments" ON public.ticket_attachments;
CREATE POLICY "clients insert own ticket attachments" ON public.ticket_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM public.support_tickets WHERE contact_id IN (
        SELECT id FROM public.contacts WHERE email = auth.jwt() ->> 'email'
      )
    )
  );
