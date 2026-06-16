-- Migration: Create workspace_email_providers table and policies
-- File: supabase/migrations/20260620000000_workspace_email_providers.sql

CREATE TABLE IF NOT EXISTS public.workspace_email_providers (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'resend' CHECK (provider IN ('resend')),
  encrypted_api_key TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workspace_email_providers ENABLE ROW LEVEL SECURITY;

-- Workspace membership-based policy
DROP POLICY IF EXISTS "Workspace member access on workspace_email_providers" ON public.workspace_email_providers;
CREATE POLICY "Workspace member access on workspace_email_providers" ON public.workspace_email_providers
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
    )
  );
