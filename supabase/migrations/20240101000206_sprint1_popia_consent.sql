-- Migration: Sprint 1 POPIA Consent Core Infrastructure

-- 1. Extend workspaces with FICA/POPIA configuration fields
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS company_reg_number TEXT,
ADD COLUMN IF NOT EXISTS kyc_data_sharing_entities TEXT[] NOT NULL DEFAULT '{}';

-- 2. Create kyc_consent table for tracking POPIA consents
CREATE TABLE IF NOT EXISTS public.kyc_consent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    check_types TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'obtained', 'revoked', 'expired')),
    reference TEXT,
    ip_address TEXT,
    device_fingerprint TEXT,
    signature_data TEXT, -- base64 representation of client signature
    consent_given_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS on kyc_consent
ALTER TABLE public.kyc_consent ENABLE ROW LEVEL SECURITY;

-- 4. Declare policy for workspace member access
DROP POLICY IF EXISTS "Workspace members manage kyc_consent" ON public.kyc_consent;
CREATE POLICY "Workspace members manage kyc_consent" ON public.kyc_consent
    FOR ALL USING (workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ));

-- 5. Attach updated_at trigger
DROP TRIGGER IF EXISTS update_kyc_consent_updated_at ON kyc_consent;
CREATE TRIGGER update_kyc_consent_updated_at
    BEFORE UPDATE ON kyc_consent
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
