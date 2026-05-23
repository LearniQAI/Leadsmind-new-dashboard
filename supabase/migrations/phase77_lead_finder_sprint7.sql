-- Migration: Lead Finder Sprint 7 - Territory Intelligence

CREATE TABLE IF NOT EXISTS public.territory_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    region TEXT NOT NULL, -- e.g., 'San Francisco, CA' or a Zip Code
    industry TEXT,
    opportunity_score INTEGER DEFAULT 0,
    opportunity_level TEXT DEFAULT 'Low', -- High, Medium, Low
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.market_density (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    territory_id UUID REFERENCES public.territory_scores(id) ON DELETE CASCADE,
    business_count INTEGER DEFAULT 0,
    average_rating NUMERIC(2,1) DEFAULT 0,
    saturation_level TEXT DEFAULT 'Low', -- High, Medium, Low
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.territory_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    territory_id UUID REFERENCES public.territory_scores(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL, -- 'gap', 'saturation', 'opportunity'
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_networks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    network_name TEXT NOT NULL, -- e.g., 'McDonalds Franchise Group'
    confidence_score INTEGER DEFAULT 0,
    headquarters_location TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_network_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID REFERENCES public.business_networks(id) ON DELETE CASCADE,
    result_id UUID REFERENCES public.lead_finder_results(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.territory_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_density ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territory_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_network_members ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their territories" 
ON public.territory_scores FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage territory density" 
ON public.market_density FOR ALL USING (
    EXISTS (SELECT 1 FROM public.territory_scores t WHERE t.id = territory_id AND t.user_id = auth.uid())
);

CREATE POLICY "Users can manage territory insights" 
ON public.territory_insights FOR ALL USING (
    EXISTS (SELECT 1 FROM public.territory_scores t WHERE t.id = territory_id AND t.user_id = auth.uid())
);

CREATE POLICY "Users can manage business networks" 
ON public.business_networks FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage business network members" 
ON public.business_network_members FOR ALL USING (
    EXISTS (SELECT 1 FROM public.business_networks n WHERE n.id = network_id AND n.user_id = auth.uid())
);
