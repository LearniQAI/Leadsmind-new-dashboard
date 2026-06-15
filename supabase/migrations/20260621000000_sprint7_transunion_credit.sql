-- Migration: Sprint 7 TransUnion Credit & Affordability Suite Columns

ALTER TABLE public.kyc_checks
ADD COLUMN IF NOT EXISTS score INTEGER,
ADD COLUMN IF NOT EXISTS risk_band TEXT,
ADD COLUMN IF NOT EXISTS defaults_count INTEGER,
ADD COLUMN IF NOT EXISTS judgements_count INTEGER,
ADD COLUMN IF NOT EXISTS total_debt_exposure NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_repayments NUMERIC DEFAULT 0;

-- Comments explaining the new columns
COMMENT ON COLUMN public.kyc_checks.score IS 'Credit score returned by TransUnion (usually on a scale of 1-999).';
COMMENT ON COLUMN public.kyc_checks.risk_band IS 'Calculated risk grade or category based on TransUnion score bands.';
COMMENT ON COLUMN public.kyc_checks.defaults_count IS 'Count of active default listings on the bureau report.';
COMMENT ON COLUMN public.kyc_checks.judgements_count IS 'Count of active civil court judgements on the bureau report.';
COMMENT ON COLUMN public.kyc_checks.total_debt_exposure IS 'Sum of outstanding principal across all active credit accounts.';
COMMENT ON COLUMN public.kyc_checks.monthly_repayments IS 'Sum of monthly installments required for credit accounts.';
