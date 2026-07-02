-- Migration: Sprint 6 - LENA AI, Branded White-Label & Automation Enhancements
-- File: supabase/migrations/20260613000004_sprint6_lena_whitelabel_automation.sql

-- 1. Alter public.workspace_branding for custom CSS values, favicons, and subdomain verification status
ALTER TABLE public.workspace_branding ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT '#eef2ff';
ALTER TABLE public.workspace_branding ADD COLUMN IF NOT EXISTS button_color TEXT DEFAULT '#2563eb';
ALTER TABLE public.workspace_branding ADD COLUMN IF NOT EXISTS typography TEXT DEFAULT 'Inter';
ALTER TABLE public.workspace_branding ADD COLUMN IF NOT EXISTS custom_domain_ssl_status TEXT DEFAULT 'pending' CHECK (custom_domain_ssl_status IN ('pending', 'active', 'failed'));
ALTER TABLE public.workspace_branding ADD COLUMN IF NOT EXISTS favicon_url TEXT DEFAULT NULL;

-- 2. Alter public.contacts to track login timestamps and re-engagement loops
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS last_reengagement_sent_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Update RLS select policy for public to view branding (e.g. unauthenticated custom domains)
DROP POLICY IF EXISTS "Public view branding" ON public.workspace_branding;
CREATE POLICY "Public view branding"
  ON public.workspace_branding FOR SELECT
  USING (true);
