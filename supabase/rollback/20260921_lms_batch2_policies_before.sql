-- Pre-Batch-2/fix-7 policy definitions (captured from live pg_policies 2026-09-21). Re-run to roll back.
DROP POLICY IF EXISTS "allow_public_select_published_courses" ON public.courses;
CREATE POLICY "allow_public_select_published_courses" ON public.courses AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((published = true) OR (status = 'published'::text)));
DROP POLICY IF EXISTS "students read published courses" ON public.courses;
CREATE POLICY "students read published courses" ON public.courses AS PERMISSIVE FOR SELECT TO authenticated USING ((published = true));
DROP POLICY IF EXISTS "public read free or preview content_blocks" ON public.content_blocks;
CREATE POLICY "public read free or preview content_blocks" ON public.content_blocks AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((EXISTS (SELECT 1 FROM course_lessons cl JOIN courses c ON c.id = cl.course_id WHERE cl.id = content_blocks.lesson_id AND ((c.published = true) OR (c.status = 'published'::text)) AND ((c.pricing_model = 'free'::text) OR (cl.is_preview = true)))));
DROP POLICY IF EXISTS "public read free or preview course_lessons" ON public.course_lessons;
CREATE POLICY "public read free or preview course_lessons" ON public.course_lessons AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((EXISTS (SELECT 1 FROM courses c WHERE c.id = course_lessons.course_id AND ((c.published = true) OR (c.status = 'published'::text)) AND ((c.pricing_model = 'free'::text) OR (course_lessons.is_preview = true)))));
DROP POLICY IF EXISTS "public read free course_modules" ON public.course_modules;
CREATE POLICY "public read free course_modules" ON public.course_modules AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((EXISTS (SELECT 1 FROM courses c WHERE c.id = course_modules.course_id AND ((c.published = true) OR (c.status = 'published'::text)) AND (c.pricing_model = 'free'::text))));
