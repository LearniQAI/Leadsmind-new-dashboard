-- Telephony Phase 2 — real per-workspace phone number inventory.
--
-- Phase 1 (20260725000000_encrypt_workspace_twilio_credentials.sql +
-- src/app/actions/settings.ts saveTwilioCredentials) gave each workspace its own encrypted
-- Twilio credentials plus a single workspace.twilio_number column used only for the existing
-- SMS/WhatsApp reminder path (Task 67/68). That single-column shape can't hold more than one
-- number and has no concept of a number's Twilio SID, capabilities, or how it was acquired.
--
-- This table is additive — workspace.twilio_number is untouched and keeps powering the
-- existing reminder path — and holds the real, multi-number inventory that number search/
-- purchase/import (Phase 2) manages. Same RLS shape as public.resources
-- (20260911120000_resource_booking.sql): check_workspace_access(workspace_id), FOR ALL.

CREATE TABLE IF NOT EXISTS public.workspace_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  twilio_number_sid TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  friendly_name TEXT,
  -- {"voice": bool, "sms": bool, "mms": bool} as reported by Twilio at purchase/import time.
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'purchased' CHECK (source IN ('purchased', 'imported')),
  -- Soft-deleted on release rather than row-deleted, so a release that happened on Twilio
  -- but only half-completed locally leaves a diagnosable trail instead of silently vanishing.
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released')),
  released_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, twilio_number_sid)
);

COMMENT ON TABLE public.workspace_phone_numbers IS
  'Real Twilio phone numbers purchased or imported into a workspace (Telephony Phase 2). Each row is a real number on that workspace''s own connected Twilio account, billed directly by Twilio.';

CREATE INDEX IF NOT EXISTS idx_workspace_phone_numbers_workspace ON public.workspace_phone_numbers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_phone_numbers_workspace_status ON public.workspace_phone_numbers(workspace_id, status);

ALTER TABLE public.workspace_phone_numbers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace access for workspace_phone_numbers" ON public.workspace_phone_numbers;
CREATE POLICY "Workspace access for workspace_phone_numbers" ON public.workspace_phone_numbers
  FOR ALL USING (check_workspace_access(workspace_id))
  WITH CHECK (check_workspace_access(workspace_id));

CREATE OR REPLACE FUNCTION public.set_workspace_phone_numbers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workspace_phone_numbers_updated_at ON public.workspace_phone_numbers;
CREATE TRIGGER trg_workspace_phone_numbers_updated_at
  BEFORE UPDATE ON public.workspace_phone_numbers
  FOR EACH ROW EXECUTE FUNCTION public.set_workspace_phone_numbers_updated_at();
