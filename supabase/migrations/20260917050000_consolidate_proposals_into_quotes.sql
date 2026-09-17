-- Consolidation: Proposals is removed as a separate feature. Quotes
-- (public.quotes) becomes the single implementation for CRM
-- proposal/quote documents. This migration:
--   1. Adds a deal_id link from quotes to opportunities (Pipeline).
--   2. Adds signature_data/signed_at so the already-built client-portal
--      e-signature flow (canvas signature, ownership checks, IP logging)
--      can attach to a real quote instead of the orphaned public.proposals
--      table it used to target.
--   3. Enables Realtime on quotes, matching the pattern already applied to
--      opportunities (20260917040000_opportunities_realtime.sql) so the
--      Quotes Ledger updates live instead of only on manual refresh.
--   4. Drops public.proposals — it never had a working insert path
--      anywhere in the app (confirmed via full-codebase grep for
--      `.from('proposals')`: only SELECT/UPDATE call sites existed, all in
--      the portal e-sign flow now migrated to quotes above). No other real
--      data depends on it.

-- 1. Deal/Pipeline linkage
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_deal_id ON public.quotes(deal_id);

-- 2. E-signature fields (mirrors the columns public.proposals had:
-- signature_data TEXT, signed_at TIMESTAMPTZ). A quote becomes signable
-- once its status is 'sent'; signing stamps signed_at/signature_data and
-- moves status to 'accepted', which is also what already unlocks
-- "Convert to Invoice" in the Quotes Ledger — signing a quote in the
-- client portal now flows directly into the existing accept->convert path.
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS signature_data TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- 3. Realtime — same rationale as opportunities: a client-side
-- postgres_changes subscription only works if the table is in the
-- supabase_realtime publication. RLS already restricts quotes to
-- workspace members via "Workspace access for quotes"; Realtime enforces
-- that per-subscriber the same way it enforces any other SELECT.
ALTER TABLE public.quotes REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'quotes'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 4. Drop the orphaned proposals table and its policy.
DROP POLICY IF EXISTS "clients view own proposals" ON public.proposals;
DROP TABLE IF EXISTS public.proposals;
