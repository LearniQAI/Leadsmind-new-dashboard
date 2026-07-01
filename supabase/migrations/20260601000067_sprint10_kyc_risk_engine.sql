-- Migration: Sprint 10 Centralized KYC Automated Risk Rating Engine
-- File: supabase/migrations/20260624000000_sprint10_kyc_risk_engine.sql

-- 1. Create public.kyc_risk_ratings table
CREATE TABLE IF NOT EXISTS public.kyc_risk_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE UNIQUE,
    overall_rating TEXT NOT NULL CHECK (overall_rating IN ('green', 'amber', 'red', 'grey')),
    rating_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    fica_complete BOOLEAN NOT NULL DEFAULT FALSE,
    fica_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kyc_risk_ratings ENABLE ROW LEVEL SECURITY;

-- 2. Configure RLS Policies
DROP POLICY IF EXISTS "workspace members manage kyc_risk_ratings" ON public.kyc_risk_ratings;
CREATE POLICY "workspace members manage kyc_risk_ratings"
  ON public.kyc_risk_ratings FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- 3. Alter public.opportunities to add manager_override column
ALTER TABLE public.opportunities 
ADD COLUMN IF NOT EXISTS manager_override BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Create trigger function to enforce compliance blockers
CREATE OR REPLACE FUNCTION public.check_kyc_compliance_before_deal_progression()
RETURNS TRIGGER AS $$
DECLARE
    v_rating RECORD;
BEGIN
    -- Only enforce compliance rules if stage_id is changing
    IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
        -- If opportunity is not linked to a contact, allow progression
        IF NEW.contact_id IS NULL THEN
            RETURN NEW;
        END IF;

        -- Get contact KYC risk rating
        SELECT * INTO v_rating
        FROM public.kyc_risk_ratings
        WHERE contact_id = NEW.contact_id;

        -- 1. Unverified (grey) / missing -> Hard Block
        IF v_rating IS NULL OR v_rating.overall_rating = 'grey' THEN
            RAISE EXCEPTION 'Compliance Blocker: Regulated pipeline progress is blocked. Contact identity is UNVERIFIED (Missing checks or consent).';
        END IF;

        -- 2. Verified High Risk (red) -> Soft Block (requires manager override)
        IF v_rating.overall_rating = 'red' THEN
            IF NEW.manager_override = FALSE THEN
                RAISE EXCEPTION 'Compliance Blocker: Deal progression halted. Contact is flagged as HIGH RISK. A manager override is required to advance this transaction.';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Bind the trigger to opportunities table
DROP TRIGGER IF EXISTS tr_check_kyc_compliance_before_deal_progression ON public.opportunities;
CREATE TRIGGER tr_check_kyc_compliance_before_deal_progression
    BEFORE UPDATE OF stage_id ON public.opportunities
    FOR EACH ROW
    EXECUTE FUNCTION public.check_kyc_compliance_before_deal_progression();
