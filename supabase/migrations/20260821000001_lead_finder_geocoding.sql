-- Persist the coordinates returned by Google Places. Keeping them on the
-- result avoids re-geocoding every lead whenever the territory map opens.
ALTER TABLE public.lead_finder_results
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS geocode_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS geocode_error TEXT;

CREATE INDEX IF NOT EXISTS idx_lead_finder_results_coordinates
  ON public.lead_finder_results (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
