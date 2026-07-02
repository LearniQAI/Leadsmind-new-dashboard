-- Phase 67: SEO Attribution & Content Pipeline triggers and rollups

-- 1. Alter contacts table to add first-touch attribution columns
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS first_touch_source TEXT,
ADD COLUMN IF NOT EXISTS first_touch_keyword TEXT,
ADD COLUMN IF NOT EXISTS first_touch_page TEXT;

-- 2. Alter seo_content_pipeline to add stage transition and stuck tracking
ALTER TABLE public.seo_content_pipeline DROP CONSTRAINT IF EXISTS seo_content_pipeline_status_check;
ALTER TABLE public.seo_content_pipeline ADD CONSTRAINT seo_content_pipeline_status_check 
    CHECK (status IN ('Idea', 'Research', 'Approved', 'Outlined', 'Writing', 'Review', 'Scheduled', 'Published', 'Indexing', 'ranking_11_50'));

ALTER TABLE public.seo_content_pipeline
ADD COLUMN IF NOT EXISTS cost NUMERIC(15, 2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS last_stage_transition_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
ADD COLUMN IF NOT EXISTS is_stuck BOOLEAN DEFAULT FALSE NOT NULL;

-- 3. Trigger to track stage transition timing
CREATE OR REPLACE FUNCTION tr_seo_content_pipeline_transition_func()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.last_stage_transition_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_seo_content_pipeline_transition ON public.seo_content_pipeline;
CREATE TRIGGER tr_seo_content_pipeline_transition
BEFORE UPDATE ON public.seo_content_pipeline
FOR EACH ROW EXECUTE FUNCTION tr_seo_content_pipeline_transition_func();

-- 4. Trigger to auto-generate content pipeline card when blog transitions to published
CREATE OR REPLACE FUNCTION tr_on_blog_post_publish_func()
RETURNS TRIGGER AS $$
DECLARE
    v_project_id UUID;
BEGIN
    IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status <> 'published') THEN
        -- Find the seo_project for this workspace
        SELECT id INTO v_project_id FROM public.seo_projects WHERE workspace_id = NEW.workspace_id LIMIT 1;
        
        -- If an SEO project exists, insert/upsert the keyword card
        IF v_project_id IS NOT NULL AND NEW.target_keyword IS NOT NULL AND NEW.target_keyword <> '' THEN
            INSERT INTO public.seo_content_pipeline (project_id, keyword, status, title, updated_at, last_stage_transition_at)
            VALUES (v_project_id, NEW.target_keyword, 'Published', NEW.title, now(), now())
            ON CONFLICT (project_id, keyword) 
            DO UPDATE SET status = 'Published', title = EXCLUDED.title, updated_at = now(), last_stage_transition_at = now();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_on_blog_post_publish ON public.blog_posts;
CREATE TRIGGER tr_on_blog_post_publish
AFTER INSERT OR UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION tr_on_blog_post_publish_func();

-- 5. Revenue Attribution Rollup Table
CREATE TABLE IF NOT EXISTS public.seo_revenue_attribution_rollup (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.seo_projects(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    total_visitors INTEGER DEFAULT 0 NOT NULL,
    won_deals_count INTEGER DEFAULT 0 NOT NULL,
    total_revenue NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    rpv NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    total_cost NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    roi NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_rollup_project_keyword_date UNIQUE (project_id, keyword, date)
);

-- Index for analytics performance
CREATE INDEX IF NOT EXISTS idx_seo_rev_attrib_project_id ON public.seo_revenue_attribution_rollup(project_id);
CREATE INDEX IF NOT EXISTS idx_seo_rev_attrib_keyword ON public.seo_revenue_attribution_rollup(keyword);
CREATE INDEX IF NOT EXISTS idx_seo_rev_attrib_date ON public.seo_revenue_attribution_rollup(date);

-- Enable RLS for rollup table
ALTER TABLE public.seo_revenue_attribution_rollup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace Members View Revenue Attribution Rollup" ON public.seo_revenue_attribution_rollup
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM public.seo_projects p
            WHERE p.workspace_id IN (
                SELECT ws_member.workspace_id 
                FROM public.workspace_members ws_member 
                WHERE ws_member.user_id = auth.uid()
            )
        )
    );

-- 6. Stored Procedure for daily revenue rollup aggregation
CREATE OR REPLACE FUNCTION rollup_seo_revenue_attribution_func(p_date DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.seo_revenue_attribution_rollup (project_id, keyword, total_visitors, won_deals_count, total_revenue, rpv, total_cost, roi, date)
    SELECT 
        p.id AS project_id,
        k.keyword,
        COALESCE(SUM(perf.clicks), 0) AS total_visitors,
        COUNT(DISTINCT opp.id) AS won_deals_count,
        COALESCE(SUM(opp.value), 0) AS total_revenue,
        CASE 
            WHEN COALESCE(SUM(perf.clicks), 0) > 0 THEN COALESCE(SUM(opp.value), 0) / SUM(perf.clicks)
            ELSE 0.00 
        END AS rpv,
        COALESCE(MIN(cp.cost), 0.00) AS total_cost,
        CASE 
            WHEN COALESCE(MIN(cp.cost), 0.00) > 0 THEN ((COALESCE(SUM(opp.value), 0.00) - MIN(cp.cost)) / MIN(cp.cost)) * 100.00
            ELSE 0.00 
        END AS roi,
        p_date AS date
    FROM public.seo_projects p
    JOIN public.seo_tracked_keywords k ON k.project_id = p.id
    LEFT JOIN public.seo_keyword_performance perf ON perf.project_id = p.id AND perf.keyword = k.keyword
    LEFT JOIN public.contacts c ON c.workspace_id = p.workspace_id AND c.first_touch_keyword = k.keyword
    LEFT JOIN public.opportunities opp ON opp.contact_id = c.id AND opp.status = 'won'
    LEFT JOIN public.seo_content_pipeline cp ON cp.project_id = p.id AND cp.keyword = k.keyword
    GROUP BY p.id, k.keyword
    ON CONFLICT (project_id, keyword, date) 
    DO UPDATE SET 
        total_visitors = EXCLUDED.total_visitors,
        won_deals_count = EXCLUDED.won_deals_count,
        total_revenue = EXCLUDED.total_revenue,
        rpv = EXCLUDED.rpv,
        total_cost = EXCLUDED.total_cost,
        roi = EXCLUDED.roi,
        created_at = now();
END;
$$ LANGUAGE plpgsql;

-- 7. Stored Procedure for content pipeline auto-promotion and stuck cards check
CREATE OR REPLACE FUNCTION auto_promote_and_flag_pipeline()
RETURNS VOID AS $$
DECLARE
    r RECORD;
    v_latest_rank INTEGER;
    v_has_performance BOOLEAN;
    v_current_idx INTEGER;
    v_target_idx INTEGER;
    v_target_status TEXT;
    v_stages TEXT[] := ARRAY['Idea', 'Research', 'Approved', 'Outlined', 'Writing', 'Review', 'Scheduled', 'Published', 'Indexing', 'ranking_11_50'];
BEGIN
    -- Flag stuck cards: last_stage_transition_at older than 21 days
    UPDATE public.seo_content_pipeline
    SET is_stuck = TRUE
    WHERE last_stage_transition_at < (now() - INTERVAL '21 days') AND is_stuck = FALSE;

    -- Unflag cards that are no longer stuck (e.g. moved stages within 21 days)
    UPDATE public.seo_content_pipeline
    SET is_stuck = FALSE
    WHERE last_stage_transition_at >= (now() - INTERVAL '21 days') AND is_stuck = TRUE;

    -- Scan and promote pipeline cards
    FOR r IN SELECT id, project_id, keyword, status FROM public.seo_content_pipeline LOOP
        -- Check latest rank
        SELECT rank INTO v_latest_rank 
        FROM public.seo_rank_history
        WHERE project_id = r.project_id AND keyword = r.keyword
        ORDER BY date DESC, created_at DESC 
        LIMIT 1;

        -- Check clicks/impressions registered in last 30 days
        SELECT EXISTS (
            SELECT 1 FROM public.seo_keyword_performance
            WHERE project_id = r.project_id AND keyword = r.keyword AND (clicks > 0 OR impressions > 0)
            LIMIT 1
        ) INTO v_has_performance;

        -- Determine target status
        v_target_status := NULL;
        IF v_latest_rank IS NOT NULL AND v_latest_rank >= 11 AND v_latest_rank <= 50 THEN
            v_target_status := 'ranking_11_50';
        ELSIF v_has_performance THEN
            v_target_status := 'Indexing';
        END IF;

        -- If target status is determined, check if it's a promotion
        IF v_target_status IS NOT NULL THEN
            -- Get index of current status
            v_current_idx := array_position(v_stages, r.status);
            -- Get index of target status
            v_target_idx := array_position(v_stages, v_target_status);

            IF v_current_idx IS NOT NULL AND v_target_idx IS NOT NULL AND v_target_idx > v_current_idx THEN
                UPDATE public.seo_content_pipeline
                SET status = v_target_status,
                    last_stage_transition_at = now()
                WHERE id = r.id;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
