-- Migration: Lead Finder MVP (Sprint 1)

CREATE TABLE IF NOT EXISTS public.lead_finder_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID,
    search_type TEXT NOT NULL,
    keywords TEXT,
    location TEXT,
    business_type TEXT,
    radius INTEGER,
    status TEXT DEFAULT 'completed',
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_finder_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_id UUID REFERENCES public.lead_finder_searches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    place_id TEXT NOT NULL,
    business_name TEXT NOT NULL,
    category TEXT,
    address TEXT,
    phone TEXT,
    website TEXT,
    rating DECIMAL,
    review_count INTEGER,
    tags TEXT[],
    status TEXT DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(search_id, place_id)
);

ALTER TABLE public.lead_finder_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_finder_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own searches" 
ON public.lead_finder_searches FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own results" 
ON public.lead_finder_results FOR ALL 
USING (auth.uid() = user_id);
