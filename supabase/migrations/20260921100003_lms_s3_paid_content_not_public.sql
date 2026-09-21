-- LMS security batch 1 / S3: the anon/authenticated "published course" SELECT policies exposed paid
-- content_blocks/lessons/modules without any enrollment check. Public landing pages, checkout,
-- previews and the student player all read these tables through the service role (verified by grep),
-- so the public policies are narrowed to free courses (or explicit is_preview lessons). Enrolled
-- students keep their existing "students read ... for enrolled courses" policies; instructors keep
-- their workspace-member ALL policies.
DROP POLICY IF EXISTS "allow_public_select_content_blocks_published_courses" ON public.content_blocks;
CREATE POLICY "public read free or preview content_blocks" ON public.content_blocks
  AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.course_lessons cl JOIN public.courses c ON c.id = cl.course_id
                 WHERE cl.id = content_blocks.lesson_id
                   AND (c.published = true OR c.status = 'published')
                   AND (c.pricing_model = 'free' OR cl.is_preview = true)));

DROP POLICY IF EXISTS "allow_public_select_lessons_published_courses" ON public.course_lessons;
CREATE POLICY "public read free or preview course_lessons" ON public.course_lessons
  AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c
                 WHERE c.id = course_lessons.course_id
                   AND (c.published = true OR c.status = 'published')
                   AND (c.pricing_model = 'free' OR course_lessons.is_preview = true)));

DROP POLICY IF EXISTS "allow_public_select_modules_published_courses" ON public.course_modules;
CREATE POLICY "public read free course_modules" ON public.course_modules
  AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c
                 WHERE c.id = course_modules.course_id
                   AND (c.published = true OR c.status = 'published')
                   AND c.pricing_model = 'free'));

-- lms_content bucket: no code references it (grep), but its SELECT was bucket-only (any authenticated
-- user, any tenant). Scope it to the workspace folder like its INSERT/DELETE policies.
DROP POLICY IF EXISTS "Users can view course content" ON storage.objects;
CREATE POLICY "Users can view course content" ON storage.objects
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (bucket_id = 'lms_content'
         AND (storage.foldername(name))[1] IN (SELECT wm.workspace_id::text FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));
