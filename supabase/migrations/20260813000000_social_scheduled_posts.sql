-- Reconciles two conflicting `CREATE TABLE IF NOT EXISTS social_posts` migrations
-- (20240101000020_phase11_12_reputation_social.sql used `scheduled_for`;
-- 20240101000157_social_posts_tiktok.sql used `scheduled_at` — since both used
-- IF NOT EXISTS, whichever ran first on a given database "won" and the other's
-- column never got added). This makes `scheduled_at` the one canonical column,
-- backfills it from `scheduled_for` if that's what actually exists, and adds the
-- columns the scheduled-dispatch worker and UI need.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'social_posts' AND column_name = 'scheduled_at'
  ) THEN
    ALTER TABLE public.social_posts ADD COLUMN scheduled_at TIMESTAMPTZ;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'social_posts' AND column_name = 'scheduled_for'
  ) THEN
    UPDATE public.social_posts SET scheduled_at = scheduled_for WHERE scheduled_at IS NULL AND scheduled_for IS NOT NULL;
  END IF;
END $$;

ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS platform_results JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.social_posts ALTER COLUMN content SET DEFAULT '';

-- Canonical status set: draft, scheduled, publishing (claimed by the dispatch
-- worker, in flight), published, failed, cancelled (user cancelled before it fired).
ALTER TABLE public.social_posts DROP CONSTRAINT IF EXISTS social_posts_status_check;
UPDATE public.social_posts SET status = 'draft' WHERE status IS NULL;
ALTER TABLE public.social_posts ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_status_check
  CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled'));

-- Dispatch worker's due-post scan: WHERE status = 'scheduled' AND scheduled_at <= now().
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_dispatch
  ON public.social_posts (scheduled_at)
  WHERE status = 'scheduled';
