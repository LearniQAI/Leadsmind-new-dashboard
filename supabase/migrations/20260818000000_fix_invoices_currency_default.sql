-- Fix: public.invoices.currency was left at DEFAULT 'USD' from the original
-- Phase 6 finance module (20240101000009_phase6_finance.sql). When Phase 16
-- rebuilt invoicing for LeadsMind's ZAR-first market, the new quotes table
-- got DEFAULT 'ZAR' but the pre-existing invoices.currency column default
-- was never updated to match. The manual Invoice Builder form has no
-- currency selector wired to the save payload, so every invoice created
-- through it silently inherited this stale USD default while the UI showed
-- "R" formatting throughout.
ALTER TABLE public.invoices ALTER COLUMN currency SET DEFAULT 'ZAR';
