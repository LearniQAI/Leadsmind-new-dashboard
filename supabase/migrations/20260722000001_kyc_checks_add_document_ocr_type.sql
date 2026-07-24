-- Task 3 (Milestone 1) follow-up: kyc/experian/trueid's OCR mode never recorded a kyc_checks
-- row (unlike liveness/address), so there was nothing for a per-check-type cooldown to query
-- and OCR checks were invisible in the same audit trail biometric/address checks already use.
-- 'document_ocr' is a new check_type value — none of the existing ones ('hanis_identity',
-- 'credit_report', 'sanctions_screen', 'pep_check', 'address_verification', 'biometric')
-- semantically fit document data extraction.

ALTER TABLE public.kyc_checks DROP CONSTRAINT IF EXISTS kyc_checks_check_type_check;

ALTER TABLE public.kyc_checks ADD CONSTRAINT kyc_checks_check_type_check CHECK (check_type in (
  'hanis_identity', 'credit_report', 'sanctions_screen',
  'pep_check', 'address_verification', 'biometric', 'document_ocr'
));
