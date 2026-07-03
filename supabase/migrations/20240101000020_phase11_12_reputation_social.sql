-- PHASE 11: REPUTATION MANAGEMENT & REVIEWS

-- Review Requests Table
CREATE TABLE IF NOT EXISTS public.review_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    channel TEXT CHECK (channel IN ('email', 'sms')),
    status TEXT CHECK (status IN ('sent', 'opened', 'clicked', 'reviewed')) DEFAULT 'sent',
    sent_at TIMESTAMPTZ DEFAULT now(),
    review_received BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Reviews Table (Fetched from Google/FB)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    platform TEXT CHECK (platform IN ('google', 'facebook')),
    external_review_id TEXT NOT NULL,
    reviewer_name TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    body TEXT,
    replied BOOLEAN DEFAULT false,
    reply_text TEXT,
    replied_at TIMESTAMPTZ,
    review_date TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, platform, external_review_id)
);

-- PHASE 12: SOCIAL MEDIA MANAGEMENT & ADVERTISING

-- Social Accounts Table
CREATE TABLE IF NOT EXISTS public.social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    platform TEXT CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'twitter', 'google_business', 'youtube', 'pinterest', 'tiktok')),
    account_name TEXT,
    account_id TEXT,
    access_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    connected_at TIMESTAMPTZ DEFAULT now()
);

-- Social Posts Table
CREATE TABLE IF NOT EXISTS public.social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    platforms TEXT[], -- Array of platforms
    content TEXT,
    media_urls TEXT[],
    scheduled_for TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    status TEXT CHECK (status IN ('draft', 'scheduled', 'published', 'failed')) DEFAULT 'draft',
    error_message TEXT,
    external_post_ids JSONB DEFAULT '{}', -- platform -> post ID
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Social Post Analytics
CREATE TABLE IF NOT EXISTS public.social_post_analytics (
    post_id UUID PRIMARY KEY REFERENCES public.social_posts(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    last_synced_at TIMESTAMPTZ
);

-- Ad Campaigns Table
CREATE TABLE IF NOT EXISTS public.ad_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    platform TEXT CHECK (platform IN ('meta', 'google')),
    external_campaign_id TEXT,
    name TEXT,
    status TEXT CHECK (status IN ('active', 'paused', 'ended')),
    budget_daily NUMERIC,
    spend_to_date NUMERIC,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    leads_created INTEGER DEFAULT 0, -- Contacts created with UTM matching this campaign
    last_synced_at TIMESTAMPTZ
);

-- RLS POLICIES FOR PHASES 11 & 12

ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Creation
DO $$ 
BEGIN
    -- Review Requests
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace Review Requests Access') THEN
        CREATE POLICY "Workspace Review Requests Access" ON public.review_requests
            FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
    END IF;

    -- Reviews
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace Reviews Access') THEN
        CREATE POLICY "Workspace Reviews Access" ON public.reviews
            FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
    END IF;

    -- Social Accounts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace Social Accounts Access') THEN
        CREATE POLICY "Workspace Social Accounts Access" ON public.social_accounts
            FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
    END IF;

    -- Social Posts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace Social Posts Access') THEN
        CREATE POLICY "Workspace Social Posts Access" ON public.social_posts
            FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
    END IF;

    -- Ad Campaigns
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace Ad Campaigns Access') THEN
        CREATE POLICY "Workspace Ad Campaigns Access" ON public.ad_campaigns
            FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
    END IF;
END $$;
