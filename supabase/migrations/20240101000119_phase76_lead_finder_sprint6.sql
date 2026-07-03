-- Migration: Lead Finder Sprint 6 - Watchlists & Alerts

CREATE TABLE IF NOT EXISTS public.lead_watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    monitoring_type TEXT NOT NULL, -- 'location', 'industry', 'keyword', 'competitor'
    criteria JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. { "location": "Lagos", "business_type": "Restaurant", "min_rating": 4.0 }
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.monitoring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID REFERENCES public.lead_watchlists(id) ON DELETE CASCADE,
    condition TEXT NOT NULL, -- 'rating_drops_below', 'new_business', 'score_increases'
    threshold TEXT,
    action TEXT NOT NULL, -- 'notify', 'add_to_queue', 'assign_owner'
    parameters JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_change_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID REFERENCES public.lead_finder_results(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'rating_change', 'website_updated', 'enrichment_completed'
    severity TEXT NOT NULL DEFAULT 'Low', -- High, Medium, Low
    previous_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    result_id UUID REFERENCES public.lead_finder_results(id) ON DELETE SET NULL,
    watchlist_id UUID REFERENCES public.lead_watchlists(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Low', -- High, Medium, Low
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alert_digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    digest_type TEXT NOT NULL, -- 'daily', 'weekly'
    content JSONB NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.lead_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_change_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_digests ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alerts_user_unread ON public.lead_alerts(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_watchlists_active ON public.lead_watchlists(is_active);

-- Policies
CREATE POLICY "Users can manage their watchlists" 
ON public.lead_watchlists FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their monitoring rules" 
ON public.monitoring_rules FOR ALL USING (
    EXISTS (SELECT 1 FROM public.lead_watchlists w WHERE w.id = watchlist_id AND w.user_id = auth.uid())
);

CREATE POLICY "Users can view their alerts" 
ON public.lead_alerts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their digests" 
ON public.alert_digests FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view change events for their leads" 
ON public.lead_change_events FOR ALL USING (
    EXISTS (SELECT 1 FROM public.lead_finder_results r WHERE r.id = result_id AND r.user_id = auth.uid())
);
