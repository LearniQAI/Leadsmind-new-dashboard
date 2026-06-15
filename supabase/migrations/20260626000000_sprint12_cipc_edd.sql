-- Migration: Sprint 12 B2B Beneficial Ownership & CIPC EDD
-- File: supabase/migrations/20260626000000_sprint12_cipc_edd.sql

-- 1. Alter public.kyc_risk_ratings to add requires_edd column
ALTER TABLE public.kyc_risk_ratings 
ADD COLUMN IF NOT EXISTS requires_edd BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Alter public.kyc_documents check constraint to support beneficial_ownership_form
ALTER TABLE public.kyc_documents 
DROP CONSTRAINT IF EXISTS chk_document_type;

ALTER TABLE public.kyc_documents 
ADD CONSTRAINT chk_document_type CHECK (document_type IN ('green_id', 'smart_id', 'passport', 'utility_bill', 'beneficial_ownership_form'));

-- 3. Create public.beneficial_owners table
CREATE TABLE IF NOT EXISTS public.beneficial_owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    owner_contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('shareholder', 'director', 'trustee', 'other')),
    share_percentage DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beneficial_owners ENABLE ROW LEVEL SECURITY;

-- Configure RLS Policies for beneficial_owners
DROP POLICY IF EXISTS "workspace members manage beneficial_owners" ON public.beneficial_owners;
CREATE POLICY "workspace members manage beneficial_owners"
  ON public.beneficial_owners FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));
