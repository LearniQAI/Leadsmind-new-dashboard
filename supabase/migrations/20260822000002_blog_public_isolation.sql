-- Public blog-media objects are stored as posts/{workspace-id}/{filename}.
-- Enforce that an authenticated uploader can only mutate objects under a
-- workspace they actually belong to.
DROP POLICY IF EXISTS "Auth Blog Media Upload" ON storage.objects;
CREATE POLICY "Auth Blog Media Upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'blog-media'
    AND (storage.foldername(name))[1] = 'posts'
    AND (storage.foldername(name))[2] IN (
      SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Auth Blog Media Update" ON storage.objects;
CREATE POLICY "Auth Blog Media Update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'blog-media'
    AND (storage.foldername(name))[1] = 'posts'
    AND (storage.foldername(name))[2] IN (
      SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'blog-media'
    AND (storage.foldername(name))[1] = 'posts'
    AND (storage.foldername(name))[2] IN (
      SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Auth Blog Media Delete" ON storage.objects;
CREATE POLICY "Auth Blog Media Delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'blog-media'
    AND (storage.foldername(name))[1] = 'posts'
    AND (storage.foldername(name))[2] IN (
      SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Anonymous comment/pageview inserts must reference a published post in the
-- exact workspace carried by the submitted row; clients cannot choose an
-- unrelated workspace_id anymore.
DROP POLICY IF EXISTS "Public can insert comments" ON public.blog_comments;
CREATE POLICY "Public can insert comments" ON public.blog_comments
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.blog_posts p
      WHERE p.id = post_id
        AND p.workspace_id = workspace_id
        AND p.status = 'published'
        AND (p.published_at IS NULL OR p.published_at <= now())
    )
  );

DROP POLICY IF EXISTS "Public can insert pageviews" ON public.blog_pageviews;
CREATE POLICY "Public can insert pageviews" ON public.blog_pageviews
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.blog_posts p
      WHERE p.id = post_id
        AND p.workspace_id = workspace_id
        AND p.status = 'published'
        AND (p.published_at IS NULL OR p.published_at <= now())
    )
  );

-- Sibling blog tables are dashboard-only. Their original permissive policies
-- allowed any direct Supabase client to read or mutate another workspace's
-- import/version records, despite the app routes requiring authentication.
DROP POLICY IF EXISTS select_import_jobs ON public.blog_import_jobs;
DROP POLICY IF EXISTS insert_import_jobs ON public.blog_import_jobs;
DROP POLICY IF EXISTS update_import_jobs ON public.blog_import_jobs;
DROP POLICY IF EXISTS delete_import_jobs ON public.blog_import_jobs;
CREATE POLICY select_import_jobs ON public.blog_import_jobs FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY insert_import_jobs ON public.blog_import_jobs FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY update_import_jobs ON public.blog_import_jobs FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY delete_import_jobs ON public.blog_import_jobs FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS select_social_imports ON public.blog_social_imports;
DROP POLICY IF EXISTS insert_social_imports ON public.blog_social_imports;
DROP POLICY IF EXISTS update_social_imports ON public.blog_social_imports;
DROP POLICY IF EXISTS delete_social_imports ON public.blog_social_imports;
CREATE POLICY select_social_imports ON public.blog_social_imports FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY insert_social_imports ON public.blog_social_imports FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY update_social_imports ON public.blog_social_imports FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY delete_social_imports ON public.blog_social_imports FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS select_post_versions ON public.blog_post_versions;
DROP POLICY IF EXISTS insert_post_versions ON public.blog_post_versions;
DROP POLICY IF EXISTS delete_post_versions ON public.blog_post_versions;
CREATE POLICY select_post_versions ON public.blog_post_versions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.blog_posts p
    JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = post_id AND wm.user_id = auth.uid()
  ));
CREATE POLICY insert_post_versions ON public.blog_post_versions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.blog_posts p
    JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = post_id AND wm.user_id = auth.uid()
  ));
CREATE POLICY delete_post_versions ON public.blog_post_versions FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.blog_posts p
    JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = post_id AND wm.user_id = auth.uid()
  ));
