-- Workspace-path enforcement for storage buckets that only checked
-- bucket_id + TO authenticated (any authenticated user in any workspace
-- could read/write/delete any object), matching the blog-media fix from
-- 20260822000002_blog_public_isolation.sql.
--
-- Per-bucket notes:
--   social-media / ai-generated-media / builder-media: object paths are
--     {workspace_id}/... (index [1]). builder-media's app code did not
--     previously include a workspace segment at all -- fixed alongside this
--     migration (src/components/builder/MediaVaultModal.tsx,
--     src/components/builder/user/ImageSettings.tsx,
--     src/components/builder/user/VideoSettings.tsx now prefix uploads with
--     the active workspace id read from the active_workspace_id cookie via
--     src/lib/workspace/activeWorkspaceClient.ts). Objects uploaded before
--     this fix have no workspace segment and will no longer be
--     updatable/deletable by anyone (they were never attributable to a
--     workspace anyway); they remain publicly readable since SELECT is
--     unchanged.
--   pages-media: no live caller anywhere in the app (confirmed via
--     repo-wide search) and the existing policies' "Workspace members can
--     ..." names never actually checked membership. With no real path
--     convention to enforce, restrict writes to service_role rather than
--     inventing one; public SELECT is left unchanged.
--   course_landing_assets (the actual bucket id -- there is no bucket named
--     "course-landing-pages"): object paths are {course_id}/..., not
--     {workspace_id}/..., so the check joins through public.courses to the
--     owning workspace, mirroring appointment_workspace_matches() from
--     20260721000002_tighten_calendar_public_policies.sql.

-- =====================================================================
-- social-media
-- =====================================================================

DROP POLICY IF EXISTS "Auth Social Media Upload" ON storage.objects;
CREATE POLICY "Auth Social Media Upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'social-media'
      AND (storage.foldername(name))[1] IN (
        SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
      )
    );

DROP POLICY IF EXISTS "Auth Social Media Update" ON storage.objects;
CREATE POLICY "Auth Social Media Update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'social-media'
      AND (storage.foldername(name))[1] IN (
        SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
    WITH CHECK (
      bucket_id = 'social-media'
      AND (storage.foldername(name))[1] IN (
        SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
      )
    );

DROP POLICY IF EXISTS "Auth Social Media Delete" ON storage.objects;
CREATE POLICY "Auth Social Media Delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'social-media'
      AND (storage.foldername(name))[1] IN (
        SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
      )
    );

-- =====================================================================
-- ai-generated-media
-- =====================================================================

DROP POLICY IF EXISTS "Auth AI Generated Media Upload" ON storage.objects;
CREATE POLICY "Auth AI Generated Media Upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'ai-generated-media'
      AND (storage.foldername(name))[1] IN (
        SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
      )
    );

DROP POLICY IF EXISTS "Auth AI Generated Media Update" ON storage.objects;
CREATE POLICY "Auth AI Generated Media Update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'ai-generated-media'
      AND (storage.foldername(name))[1] IN (
        SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
    WITH CHECK (
      bucket_id = 'ai-generated-media'
      AND (storage.foldername(name))[1] IN (
        SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
      )
    );

DROP POLICY IF EXISTS "Auth AI Generated Media Delete" ON storage.objects;
CREATE POLICY "Auth AI Generated Media Delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'ai-generated-media'
      AND (storage.foldername(name))[1] IN (
        SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
      )
    );

-- =====================================================================
-- builder-media
-- =====================================================================

DROP POLICY IF EXISTS "Auth Builder Media Upload" ON storage.objects;
CREATE POLICY "Auth Builder Media Upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'builder-media'
      AND (storage.foldername(name))[1] IN (
        SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
      )
    );

DROP POLICY IF EXISTS "Auth Builder Media Update" ON storage.objects;
CREATE POLICY "Auth Builder Media Update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'builder-media'
      AND (storage.foldername(name))[1] IN (
        SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
    WITH CHECK (
      bucket_id = 'builder-media'
      AND (storage.foldername(name))[1] IN (
        SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
      )
    );

DROP POLICY IF EXISTS "Auth Builder Media Delete" ON storage.objects;
CREATE POLICY "Auth Builder Media Delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'builder-media'
      AND (storage.foldername(name))[1] IN (
        SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
      )
    );

-- =====================================================================
-- pages-media -- no live caller anywhere in the app; restrict to
-- service_role rather than inventing a path convention with no evidence.
-- =====================================================================

DROP POLICY IF EXISTS "Workspace members can upload page media" ON storage.objects;
CREATE POLICY "Service role can upload page media" ON storage.objects
    FOR INSERT TO service_role
    WITH CHECK (bucket_id = 'pages-media');

DROP POLICY IF EXISTS "Workspace members can update page media" ON storage.objects;
CREATE POLICY "Service role can update page media" ON storage.objects
    FOR UPDATE TO service_role
    USING (bucket_id = 'pages-media')
    WITH CHECK (bucket_id = 'pages-media');

DROP POLICY IF EXISTS "Workspace members can delete page media" ON storage.objects;
CREATE POLICY "Service role can delete page media" ON storage.objects
    FOR DELETE TO service_role
    USING (bucket_id = 'pages-media');

-- =====================================================================
-- course_landing_assets -- path is {course_id}/..., joins through
-- public.courses to the owning workspace.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.course_workspace_matches(p_course_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE c.id::text = p_course_id
      AND wm.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.course_workspace_matches(text) FROM public;
GRANT EXECUTE ON FUNCTION public.course_workspace_matches(text) TO authenticated;

DROP POLICY IF EXISTS "Allow auth insert on course_landing_assets" ON storage.objects;
CREATE POLICY "Allow auth insert on course_landing_assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'course_landing_assets'
    AND public.course_workspace_matches((storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS "Allow auth update on course_landing_assets" ON storage.objects;
CREATE POLICY "Allow auth update on course_landing_assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'course_landing_assets'
    AND public.course_workspace_matches((storage.foldername(name))[1])
  )
  WITH CHECK (
    bucket_id = 'course_landing_assets'
    AND public.course_workspace_matches((storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS "Allow auth delete on course_landing_assets" ON storage.objects;
CREATE POLICY "Allow auth delete on course_landing_assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'course_landing_assets'
    AND public.course_workspace_matches((storage.foldername(name))[1])
  );
