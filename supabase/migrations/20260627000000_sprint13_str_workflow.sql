-- Migration: Sprint 13 Centralized FIC Suspicious Transaction Reporting (STR) Workflow
-- File: supabase/migrations/20260627000000_sprint13_str_workflow.sql

-- 1. Alter public.workspace_members role check constraint to include 'compliance'
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'workspace_members'
          AND tc.constraint_type = 'CHECK'
          AND ccu.column_name = 'role'
    ) LOOP
        EXECUTE 'ALTER TABLE public.workspace_members DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.workspace_members ADD CONSTRAINT workspace_members_role_check CHECK (role IN ('admin', 'member', 'client', 'viewer', 'hr', 'payroll', 'compliance'));

-- 2. Alter public.kyc_risk_ratings to add STR status columns
ALTER TABLE public.kyc_risk_ratings 
ADD COLUMN IF NOT EXISTS str_filed BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS str_filed_at TIMESTAMPTZ;

-- 3. Alter public.kyc_documents to add consent_id and update document_type constraint
ALTER TABLE public.kyc_documents
ADD COLUMN IF NOT EXISTS consent_id UUID REFERENCES public.kyc_consent_records(id) ON DELETE SET NULL;

ALTER TABLE public.kyc_documents
DROP CONSTRAINT IF EXISTS chk_document_type;

ALTER TABLE public.kyc_documents
ADD CONSTRAINT chk_document_type CHECK (document_type IN ('green_id', 'smart_id', 'passport', 'utility_bill', 'beneficial_ownership_form', 'str_report'));

-- 4. Create public.str_reports table with isolated compliance access
CREATE TABLE IF NOT EXISTS public.str_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    transaction_details JSONB NOT NULL,
    anomalies TEXT[] DEFAULT '{}',
    status TEXT NOT NULL CHECK (status IN ('draft', 'filed')),
    xml_payload TEXT,
    json_payload JSONB,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS) on public.str_reports
ALTER TABLE public.str_reports ENABLE ROW LEVEL SECURITY;

-- Configure RLS Policies: only admin and compliance workspace members can access STRs
DROP POLICY IF EXISTS "admin and compliance manage str_reports" ON public.str_reports;
CREATE POLICY "admin and compliance manage str_reports"
  ON public.str_reports FOR ALL
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.role IN ('admin', 'compliance')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.role IN ('admin', 'compliance')
    )
  );
