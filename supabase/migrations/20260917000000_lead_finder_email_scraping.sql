-- Lead Finder: website-scrape email sourcing (scrape-first).
--
-- Google Places has no email field for any place type — this is a hard
-- platform limitation, not a missed column. Since `website` is already
-- captured per lead, this adds a real (found-on-page, not guessed) email
-- scraped from that business's own homepage/contact page, plus a simple
-- hit-rate counter so a future paid-enrichment-API decision (Hunter/Apollo/
-- Snov) can be made from real numbers instead of guesswork.

ALTER TABLE public.lead_finder_results
  ADD COLUMN IF NOT EXISTS email TEXT;

CREATE TABLE IF NOT EXISTS public.lead_finder_email_scrape_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    attempted_count INTEGER NOT NULL DEFAULT 0,
    found_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id)
);

COMMENT ON TABLE public.lead_finder_email_scrape_stats IS
  'Per-workspace counters of website-scrape attempts vs. emails actually found. Exists to answer "is scrape-only sufficient or do we need a paid enrichment API" with real data rather than a guess.';

ALTER TABLE public.lead_finder_email_scrape_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace access for lead_finder_email_scrape_stats" ON public.lead_finder_email_scrape_stats;
CREATE POLICY "Workspace access for lead_finder_email_scrape_stats" ON public.lead_finder_email_scrape_stats
  FOR ALL USING (check_workspace_access(workspace_id))
  WITH CHECK (check_workspace_access(workspace_id));
