-- Migration: Sprint 11 Real Estate Pipeline Enforcement (EAAB / PPRA Compliance)
-- File: supabase/migrations/20260625000000_sprint11_real_estate_pipeline.sql

-- 1. Alter public.opportunities to add buyer_id and seller_id columns
ALTER TABLE public.opportunities 
ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- 2. Create public.conveyancing_shares table
CREATE TABLE IF NOT EXISTS public.conveyancing_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
    attorney_name TEXT NOT NULL,
    attorney_email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conveyancing_shares ENABLE ROW LEVEL SECURITY;

-- Configure RLS Policies for conveyancing_shares
DROP POLICY IF EXISTS "workspace members manage conveyancing_shares" ON public.conveyancing_shares;
CREATE POLICY "workspace members manage conveyancing_shares"
  ON public.conveyancing_shares FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "anonymous select conveyancing_shares" ON public.conveyancing_shares;
CREATE POLICY "anonymous select conveyancing_shares"
  ON public.conveyancing_shares FOR SELECT
  USING (true);

-- 3. Create public.source_of_funds_declarations table
CREATE TABLE IF NOT EXISTS public.source_of_funds_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    funds_source TEXT CHECK (funds_source IN ('savings', 'inheritance', 'bank_loan', 'sale_of_property', 'other')),
    custom_description TEXT,
    amount DECIMAL(12,2),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted')),
    whatsapp_sent_at TIMESTAMPTZ,
    declared_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.source_of_funds_declarations ENABLE ROW LEVEL SECURITY;

-- Configure RLS Policies for source_of_funds_declarations
DROP POLICY IF EXISTS "workspace members manage declarations" ON public.source_of_funds_declarations;
CREATE POLICY "workspace members manage declarations"
  ON public.source_of_funds_declarations FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "anonymous select declaration by token" ON public.source_of_funds_declarations;
CREATE POLICY "anonymous select declaration by token"
  ON public.source_of_funds_declarations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "anonymous update declaration by token" ON public.source_of_funds_declarations;
CREATE POLICY "anonymous update declaration by token"
  ON public.source_of_funds_declarations FOR UPDATE
  USING (true) WITH CHECK (true);

-- 4. Create trigger function to enforce dual-KYC compliance and standard KYC rules
CREATE OR REPLACE FUNCTION public.check_kyc_compliance_before_deal_progression()
RETURNS TRIGGER AS $$
DECLARE
    v_stage_name TEXT;
    v_buyer_id UUID;
    v_buyer_rating TEXT;
    v_seller_rating TEXT;
    v_buyer_name TEXT;
    v_seller_name TEXT;
    v_rating RECORD;
BEGIN
    -- Only enforce compliance rules if stage_id is changing
    IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
        -- Get the target stage name
        SELECT name INTO v_stage_name
        FROM public.pipeline_stages
        WHERE id = NEW.stage_id;

        -- Check if it is a strict real estate progression stage (Offer to Purchase Submitted or Under Contract)
        IF lower(v_stage_name) IN ('offer to purchase submitted', 'under contract') THEN
            -- Determine buyer contact (use buyer_id if set, fallback to contact_id)
            v_buyer_id := COALESCE(NEW.buyer_id, NEW.contact_id);

            -- 1. Check if both buyer and seller are linked
            IF v_buyer_id IS NULL OR NEW.seller_id IS NULL THEN
                RAISE EXCEPTION 'Compliance Blocker: Both Buyer and Seller must be assigned to the property deal before shifting to %.', v_stage_name;
            END IF;

            -- 2. Check buyer risk rating (must be green)
            SELECT overall_rating INTO v_buyer_rating
            FROM public.kyc_risk_ratings
            WHERE contact_id = v_buyer_id;

            IF v_buyer_rating IS NULL OR v_buyer_rating != 'green' THEN
                SELECT concat(first_name, ' ', last_name) INTO v_buyer_name
                FROM public.contacts
                WHERE id = v_buyer_id;
                RAISE EXCEPTION 'Compliance Blocker: KYC incomplete for % — identity verification required before shifting to %.', COALESCE(v_buyer_name, 'Buyer'), v_stage_name;
            END IF;

            -- 3. Check seller risk rating (must be green)
            SELECT overall_rating INTO v_seller_rating
            FROM public.kyc_risk_ratings
            WHERE contact_id = NEW.seller_id;

            IF v_seller_rating IS NULL OR v_seller_rating != 'green' THEN
                SELECT concat(first_name, ' ', last_name) INTO v_seller_name
                FROM public.contacts
                WHERE id = NEW.seller_id;
                RAISE EXCEPTION 'Compliance Blocker: KYC incomplete for % — identity verification required before shifting to %.', COALESCE(v_seller_name, 'Seller'), v_stage_name;
            END IF;

        ELSE
            -- Apply standard Sprint 10 checks
            IF NEW.contact_id IS NULL THEN
                RETURN NEW;
            END IF;

            -- Get contact KYC risk rating
            SELECT * INTO v_rating
            FROM public.kyc_risk_ratings
            WHERE contact_id = NEW.contact_id;

            -- Unverified (grey) / missing -> Hard Block
            IF v_rating IS NULL OR v_rating.overall_rating = 'grey' THEN
                RAISE EXCEPTION 'Compliance Blocker: Regulated pipeline progress is blocked. Contact identity is UNVERIFIED (Missing checks or consent).';
            END IF;

            -- Verified High Risk (red) -> Soft Block (requires manager override)
            IF v_rating.overall_rating = 'red' THEN
                IF NEW.manager_override = FALSE THEN
                    RAISE EXCEPTION 'Compliance Blocker: Deal progression halted. Contact is flagged as HIGH RISK. A manager override is required to advance this transaction.';
                END IF;
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
