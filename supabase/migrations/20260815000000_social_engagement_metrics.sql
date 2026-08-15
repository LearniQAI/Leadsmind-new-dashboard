-- Real engagement-analytics ingestion (Task 94), replacing the "Coming soon" placeholder at
-- /social/analytics. Covers the same three platforms as Task 93's comment inbox for the same
-- reason: YouTube Analytics, Facebook Page/post Insights, and Instagram media Insights are the
-- only analytics APIs actually reachable at our current app tier. LinkedIn needs Marketing
-- Developer Platform partner access (same blocker as LinkedIn refresh tokens) and TikTok's
-- public Content Posting API has no analytics/insights endpoints at any tier — neither gets a
-- row here, and the analytics UI/cron worker must never claim otherwise.

CREATE TABLE IF NOT EXISTS public.social_engagement_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.social_posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'youtube')),
  platform_post_id TEXT NOT NULL, -- the post/media/video id the metric was fetched against
  metric_type TEXT NOT NULL, -- e.g. post_impressions, reach, views, estimatedMinutesWatched
  metric_date DATE NOT NULL, -- day the metric applies to (YouTube's per-day rows; fetch day for lifetime Facebook/Instagram metrics)
  value NUMERIC NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Re-polling the same day updates that day's row (upsert) instead of duplicating — keeps a
  -- real per-day time series without unbounded growth from a 5-minute polling cadence.
  UNIQUE (platform, platform_post_id, metric_type, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_social_engagement_metrics_workspace
  ON public.social_engagement_metrics (workspace_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_social_engagement_metrics_post
  ON public.social_engagement_metrics (post_id, platform);

ALTER TABLE public.social_engagement_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY social_engagement_metrics_workspace_isolation ON public.social_engagement_metrics
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Tracked independently from comments_last_synced_at (added in 20260814000000_social_comments.sql)
-- since comment sync and metrics sync are different API calls with independent success/failure —
-- a post can have fresh comments but stale metrics, or vice versa.
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS metrics_last_synced_at TIMESTAMPTZ;
