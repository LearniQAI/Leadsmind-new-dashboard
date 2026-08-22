-- Keep SEO metadata separate from the editorial summary. Existing public pages
-- retain their current description by inheriting the summary exactly once.
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS meta_description TEXT;

UPDATE public.blog_posts
SET meta_description = summary
WHERE meta_description IS NULL
  AND summary IS NOT NULL;

-- Version records belong to the same tenant as their parent post. Backfill the
-- missing column from the authoritative parent relationship before enforcing it.
ALTER TABLE public.blog_post_versions
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.blog_post_versions version
SET workspace_id = post.workspace_id
FROM public.blog_posts post
WHERE post.id = version.post_id
  AND version.workspace_id IS NULL;

ALTER TABLE public.blog_post_versions
  ALTER COLUMN workspace_id SET NOT NULL;

-- Enforce the parent post/workspace relationship even for service-role writes.
ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_id_workspace_id_key UNIQUE (id, workspace_id);

ALTER TABLE public.blog_post_versions
  ADD CONSTRAINT blog_post_versions_post_workspace_fkey
  FOREIGN KEY (post_id, workspace_id)
  REFERENCES public.blog_posts(id, workspace_id)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_blog_post_versions_workspace_post
  ON public.blog_post_versions(workspace_id, post_id, created_at DESC);

DROP POLICY IF EXISTS select_post_versions ON public.blog_post_versions;
DROP POLICY IF EXISTS insert_post_versions ON public.blog_post_versions;
DROP POLICY IF EXISTS delete_post_versions ON public.blog_post_versions;

CREATE POLICY select_post_versions ON public.blog_post_versions
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY insert_post_versions ON public.blog_post_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.blog_posts post
      WHERE post.id = post_id AND post.workspace_id = workspace_id
    )
  );

CREATE POLICY delete_post_versions ON public.blog_post_versions
  FOR DELETE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));
