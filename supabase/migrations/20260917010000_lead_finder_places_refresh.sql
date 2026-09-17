-- Lead Finder: bring cached Google Places fields into ToS compliance.
--
-- Google's Places API policy: place_id may be cached indefinitely,
-- coordinates for up to 30 days, and other content (name, address, phone,
-- rating, website) is meant to be re-fetched live rather than stored
-- permanently. lead_finder_results has stored these fields indefinitely
-- with no expiry since Sprint 1 — this adds the staleness marker that
-- lets a read-time refresh (src/lib/lead-finder/PlacesRefreshService.ts)
-- know when to re-fetch via the already-stored place_id.
--
-- Backfilled to created_at for existing rows: that's the real timestamp
-- their Google data was actually fetched, not a fabricated "now".
ALTER TABLE public.lead_finder_results
  ADD COLUMN IF NOT EXISTS places_data_fetched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS places_refetch_error TEXT;

UPDATE public.lead_finder_results
SET places_data_fetched_at = created_at
WHERE places_data_fetched_at IS NULL;
