-- Migration: Phase 101 - Customer Portal Schema & RLS Policies
-- File: supabase/migrations/20260613000000_customer_portal_rls.sql

-- 1. Alter contacts table for Portal Access
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS portal_access_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS portal_access_revoked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS portal_invited_at TIMESTAMPTZ;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS portal_revoked_at TIMESTAMPTZ;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS portal_password_hash TEXT;

-- Ensure created_by exists on media_files in case of older schema versions
ALTER TABLE public.media_files ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Create Portal OTPs Table for WhatsApp OTP Verification
CREATE TABLE IF NOT EXISTS public.portal_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on portal_otps
ALTER TABLE public.portal_otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access portal_otps" ON public.portal_otps FOR ALL USING (true);

-- 3. Create Admin Impersonation Logs Table
CREATE TABLE IF NOT EXISTS public.admin_impersonation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  reason TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- Enable RLS on admin_impersonation_logs
ALTER TABLE public.admin_impersonation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members view impersonation logs" ON public.admin_impersonation_logs
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins insert impersonation logs" ON public.admin_impersonation_logs
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

-- 4. Enable RLS and add SELECT policies for Clients
-- Invoices
DROP POLICY IF EXISTS "clients view own invoices" ON public.invoices;
CREATE POLICY "clients view own invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Quotes
DROP POLICY IF EXISTS "clients view own quotes" ON public.quotes;
CREATE POLICY "clients view own quotes" ON public.quotes
  FOR SELECT TO authenticated
  USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Proposals
DROP POLICY IF EXISTS "clients view own proposals" ON public.proposals;
CREATE POLICY "clients view own proposals" ON public.proposals
  FOR SELECT TO authenticated
  USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Projects
DROP POLICY IF EXISTS "clients view own projects" ON public.projects;
CREATE POLICY "clients view own projects" ON public.projects
  FOR SELECT TO authenticated
  USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Project Tasks
DROP POLICY IF EXISTS "clients view own project tasks" ON public.project_tasks;
CREATE POLICY "clients view own project tasks" ON public.project_tasks
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE contact_id IN (
        SELECT id FROM public.contacts WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

-- Support Tickets
DROP POLICY IF EXISTS "clients view own support tickets" ON public.support_tickets;
CREATE POLICY "clients view own support tickets" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Contact Documents
DROP POLICY IF EXISTS "clients view own contact documents" ON public.contact_documents;
CREATE POLICY "clients view own contact documents" ON public.contact_documents
  FOR SELECT TO authenticated
  USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Media Files (Virtual file storage)
DROP POLICY IF EXISTS "clients view own media files" ON public.media_files;
CREATE POLICY "clients view own media files" ON public.media_files
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT file_id FROM public.contact_documents WHERE contact_id IN (
        SELECT id FROM public.contacts WHERE email = auth.jwt() ->> 'email'
      )
    )
    OR created_by = auth.uid()
  );
