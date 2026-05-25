-- Migration: Lead Finder Sprint 5 - Opportunity Intelligence

-- 1. Opportunity Scores
CREATE TABLE IF NOT EXISTS public.opportunity_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID REFERENCES public.lead_finder_results(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    tier TEXT NOT NULL DEFAULT 'Low', -- High, Medium, Low
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Website Analysis
CREATE TABLE IF NOT EXISTS public.website_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID REFERENCES public.lead_finder_results(id) ON DELETE CASCADE,
    has_https BOOLEAN DEFAULT false,
    mobile_responsive BOOLEAN DEFAULT false,
    has_social_links BOOLEAN DEFAULT false,
    has_contact_forms BOOLEAN DEFAULT false,
    has_booking BOOLEAN DEFAULT false,
    tech_stack TEXT[] DEFAULT '{}',
    health_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Competitor Context
CREATE TABLE IF NOT EXISTS public.competitor_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID REFERENCES public.lead_finder_results(id) ON DELETE CASCADE,
    competitor_name TEXT NOT NULL,
    rating NUMERIC(2,1) DEFAULT 0,
    distance_meters INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Opportunity Recommendations
CREATE TABLE IF NOT EXISTS public.opportunity_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID REFERENCES public.lead_finder_results(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'angle', 'pain_point', 'service_opportunity'
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Opportunity Activity
CREATE TABLE IF NOT EXISTS public.opportunity_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID REFERENCES public.lead_finder_results(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Extend results table for pipeline value
ALTER TABLE public.lead_finder_results
ADD COLUMN estimated_value NUMERIC(12,2) DEFAULT 0.00;

-- RLS
ALTER TABLE public.opportunity_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_activity ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_opp_scores_result_id ON public.opportunity_scores(result_id);
CREATE INDEX IF NOT EXISTS idx_website_analysis_result_id ON public.website_analysis(result_id);

-- Policies (Basic isolation logic)
CREATE POLICY "Users can manage their own opportunity data" 
ON public.opportunity_scores FOR ALL 
USING (EXISTS (SELECT 1 FROM public.lead_finder_results r WHERE r.id = result_id AND r.user_id = auth.uid()));

CREATE POLICY "Users can manage their own website analysis" 
ON public.website_analysis FOR ALL 
USING (EXISTS (SELECT 1 FROM public.lead_finder_results r WHERE r.id = result_id AND r.user_id = auth.uid()));

CREATE POLICY "Users can manage their own competitor context" 
ON public.competitor_context FOR ALL 
USING (EXISTS (SELECT 1 FROM public.lead_finder_results r WHERE r.id = result_id AND r.user_id = auth.uid()));

CREATE POLICY "Users can manage their own recommendations" 
ON public.opportunity_recommendations FOR ALL 
USING (EXISTS (SELECT 1 FROM public.lead_finder_results r WHERE r.id = result_id AND r.user_id = auth.uid()));

CREATE POLICY "Users can manage their own opportunity activities" 
ON public.opportunity_activity FOR ALL 
USING (EXISTS (SELECT 1 FROM public.lead_finder_results r WHERE r.id = result_id AND r.user_id = auth.uid()));
