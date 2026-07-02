-- Migration: Sprints 2 & 3 Identity & AML Verification Integrations

-- 1. Extend contacts table with KYC verification fields
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS id_number TEXT,
ADD COLUMN IF NOT EXISTS kyc_id_verified BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS kyc_id_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS kyc_risk_flag TEXT NOT NULL DEFAULT 'LOW';

-- Add check constraint on contacts.kyc_risk_flag
ALTER TABLE public.contacts 
DROP CONSTRAINT IF EXISTS chk_kyc_risk_flag;

ALTER TABLE public.contacts 
ADD CONSTRAINT chk_kyc_risk_flag 
CHECK (kyc_risk_flag IN ('LOW', 'MEDIUM', 'HIGH'));

-- 2. Extend kyc_checks table with AML match fields
ALTER TABLE public.kyc_checks
ADD COLUMN IF NOT EXISTS aml_match_level TEXT,
ADD COLUMN IF NOT EXISTS aml_match_details JSONB NOT NULL DEFAULT '{}';

-- Add check constraint on kyc_checks.aml_match_level
ALTER TABLE public.kyc_checks
DROP CONSTRAINT IF EXISTS chk_aml_match_level;

ALTER TABLE public.kyc_checks
ADD CONSTRAINT chk_aml_match_level
CHECK (aml_match_level IN ('STRONG_MATCH', 'MEDIUM_MATCH', 'WEAK_MATCH', 'NO_MATCH'));

-- 3. Create FICA compliance lock trigger function
CREATE OR REPLACE FUNCTION public.check_kyc_compliance_lock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.kyc_risk_flag = 'HIGH' AND NEW.kyc_id_verified = TRUE THEN
    RAISE EXCEPTION 'Cannot mark contact as FICA-verified because they have a HIGH risk flag (compliance lock).';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to contacts table
DROP TRIGGER IF EXISTS tr_check_kyc_compliance_lock ON public.contacts;
CREATE TRIGGER tr_check_kyc_compliance_lock
    BEFORE INSERT OR UPDATE ON public.contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.check_kyc_compliance_lock();

-- 4. Create AML escalation trigger function
CREATE OR REPLACE FUNCTION public.handle_kyc_checks_change()
RETURNS TRIGGER AS $$
DECLARE
    v_owner_id UUID;
    v_contact_name TEXT;
    v_admin_id UUID;
BEGIN
    -- If an AML check is registered with a STRONG_MATCH
    IF NEW.check_type = 'aml_screening' AND NEW.aml_match_level = 'STRONG_MATCH' THEN
        -- 1. Halt all active CRM deals linked to that contact
        UPDATE public.opportunities
        SET status = 'lost',
            updated_at = now()
        WHERE contact_id = NEW.contact_id AND status = 'open';

        -- Get contact name
        SELECT (first_name || ' ' || last_name) INTO v_contact_name
        FROM public.contacts
        WHERE id = NEW.contact_id;

        -- Get workspace owner ID
        SELECT owner_id INTO v_owner_id
        FROM public.workspaces
        WHERE id = NEW.workspace_id;

        -- 2. Fire alert to workspace owner
        IF v_owner_id IS NOT NULL THEN
            INSERT INTO public.notifications (workspace_id, user_id, type, title, message, link)
            VALUES (
                NEW.workspace_id,
                v_owner_id,
                'system',
                'Critical AML Alert',
                'Sanctions match (STRONG_MATCH) detected for ' || COALESCE(v_contact_name, 'Unknown Contact') || '. All active deals have been automatically halted.',
                '/contacts/' || NEW.contact_id
            );
        END IF;

        -- Fire alerts to all workspace admins
        FOR v_admin_id IN 
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = NEW.workspace_id AND role = 'admin' AND user_id != COALESCE(v_owner_id, gen_random_uuid())
        LOOP
            INSERT INTO public.notifications (workspace_id, user_id, type, title, message, link)
            VALUES (
                NEW.workspace_id,
                v_admin_id,
                'system',
                'Critical AML Alert',
                'Sanctions match (STRONG_MATCH) detected for ' || COALESCE(v_contact_name, 'Unknown Contact') || '. All active deals have been automatically halted.',
                '/contacts/' || NEW.contact_id
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to kyc_checks table
DROP TRIGGER IF EXISTS tr_on_kyc_checks_change ON public.kyc_checks;
CREATE TRIGGER tr_on_kyc_checks_change
    AFTER INSERT OR UPDATE ON public.kyc_checks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_kyc_checks_change();
