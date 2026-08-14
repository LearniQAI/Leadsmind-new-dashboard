-- Unified comment inbox (Task 93). Only YouTube, Facebook, and Instagram have a real
-- comment read/reply API at our current app tier — LinkedIn needs the Marketing Developer
-- Platform partner tier (same blocker as LinkedIn refresh tokens) and TikTok's public
-- Content Posting API has no comment endpoints at any tier. Platform check constraint below
-- intentionally only allows the three platforms that are actually buildable.

CREATE TABLE IF NOT EXISTS public.social_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.social_posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'youtube')),
  platform_post_id TEXT NOT NULL, -- the post/media id comments were fetched against
  comment_id TEXT NOT NULL, -- platform's native comment id
  parent_comment_id TEXT, -- set for reply-to-a-reply threads (YouTube) where applicable
  author_name TEXT,
  author_handle TEXT,
  text TEXT NOT NULL DEFAULT '',
  permalink TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'replied')),
  our_reply_id TEXT, -- native id of the reply comment we posted, set only after a confirmed API response
  our_reply_text TEXT,
  replied_at TIMESTAMPTZ,
  comment_created_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (platform, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_social_comments_workspace ON public.social_comments (workspace_id, comment_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_comments_status ON public.social_comments (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_social_comments_platform_post ON public.social_comments (platform, platform_post_id);

ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY social_comments_workspace_isolation ON public.social_comments
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Tracks per-post comment-sync progress so the polling cron worker knows which
-- published posts to check and doesn't rescan the entire history every run.
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS comments_last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_social_posts_comment_sync
  ON public.social_posts (published_at)
  WHERE status = 'published';
