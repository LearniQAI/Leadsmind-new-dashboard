-- Fix: KYC compliance trigger blocked EVERY deal's stage move in EVERY
-- pipeline, not just real-estate transactions.
--
-- Root cause (confirmed live: reproduced the exact "Compliance Blocker:
-- ... Contact identity is UNVERIFIED" error against a plain, ordinary
-- sales pipeline with no real-estate involvement whatsoever):
-- check_kyc_compliance_before_deal_progression() (20240101000210 —
-- "Sprint 11 Real Estate Pipeline Enforcement / EAAB / PPRA Compliance")
-- is bound BEFORE UPDATE OF stage_id ON opportunities with no scoping at
-- all — it fires for every workspace, every pipeline, every deal. Its
-- "standard checks" branch blocks ANY stage move for a deal that has a
-- contact_id but no `kyc_risk_ratings` row, which is every ordinary CRM
-- deal, since KYC records are only ever created for real property
-- transactions (src/app/actions/propertyDeals.ts). Confirmed: nothing in
-- this codebase creates a kyc_risk_ratings row for a plain sales contact,
-- so this trigger has been unconditionally blocking drag-and-drop (and
-- edit-modal) stage moves for every non-real-estate pipeline.
--
-- Fix: real-estate deals are the only ones that ever get buyer_id/
-- seller_id populated (only propertyDeals.ts sets seller_id, ever) — an
-- ordinary CRM deal only ever has contact_id. Scope the whole compliance
-- check to deals that are actually part of a real-estate transaction;
-- everything else (the overwhelming majority of deals in this app) skips
-- it entirely, same as before this feature existed.
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
    -- Only enforce compliance rules if stage_id is changing, AND this is
    -- actually a real-estate deal (has a buyer_id or seller_id). An
    -- ordinary CRM deal — the vast majority of `opportunities` rows —
    -- never has either populated and is never subject to this at all.
    IF NEW.stage_id IS DISTINCT FROM OLD.stage_id
       AND (NEW.buyer_id IS NOT NULL OR NEW.seller_id IS NOT NULL) THEN
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
