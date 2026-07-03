-- Migration: Lead Finder MVP (Sprint 2) - Enrichment & Saved Searches

-- Add alert and scheduling features to searches
ALTER TABLE public.lead_finder_searches
ADD COLUMN alerts_enabled BOOLEAN DEFAULT false,
ADD COLUMN last_run_at TIMESTAMPTZ,
ADD COLUMN schedule_frequency TEXT DEFAULT 'weekly';

-- Add enrichment and scoring data to results
ALTER TABLE public.lead_finder_results
ADD COLUMN linkedin_url TEXT,
ADD COLUMN facebook_url TEXT,
ADD COLUMN employee_size TEXT,
ADD COLUMN lead_score INTEGER DEFAULT 0,
ADD COLUMN enrichment_status TEXT DEFAULT 'pending', -- pending, enriching, completed, failed
ADD COLUMN industry TEXT,
ADD COLUMN description TEXT;

-- Create an enrichment metadata table if we need to store raw payloads later
CREATE TABLE IF NOT EXISTS public.lead_finder_enrichment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID REFERENCES public.lead_finder_results(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'linkedin', 'facebook', 'google'
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lead_finder_enrichment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own enrichment logs" 
ON public.lead_finder_enrichment_logs FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.lead_finder_results r 
        WHERE r.id = result_id AND r.user_id = auth.uid()
    )
);
