-- KYC document encryption used AES-256-CBC (no auth tag/integrity check) and
-- an insecure hardcoded fallback key when KYC_ENCRYPTION_KEY was unset
-- (src/app/api/kyc/documents/{upload,download}/route.ts). Upgrading new
-- uploads to AES-256-GCM (authenticated). Existing rows keep decrypting via
-- the legacy CBC path, tagged explicitly by encryption_algorithm rather than
-- inferred, so there is no ambiguity or silent misdecryption risk.

ALTER TABLE public.kyc_documents
  ADD COLUMN IF NOT EXISTS encryption_algorithm TEXT NOT NULL DEFAULT 'aes-256-cbc';

ALTER TABLE public.kyc_documents
  ADD COLUMN IF NOT EXISTS encryption_auth_tag TEXT;

-- Existing rows were all encrypted with the legacy scheme; make that explicit
-- rather than relying on the column default for already-existing data.
UPDATE public.kyc_documents
  SET encryption_algorithm = 'aes-256-cbc'
  WHERE encryption_algorithm IS NULL OR encryption_algorithm = '';
