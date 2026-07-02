-- Migration: Add course landing pages support
-- File: supabase/migrations/20260611000000_course_landing_pages.sql

-- 1. Add slug and landing_page_settings to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS landing_page_settings JSONB DEFAULT '{
  "template": "clean_minimal",
  "tagline": "",
  "outcomes": [],
  "faq": [],
  "visible_sections": {
    "hero": true,
    "outcomes": true,
    "curriculum": true,
    "instructor": true,
    "reviews": true,
    "pricing": true,
    "faq": true
  },
  "instructor": {
    "name": "",
    "bio": "",
    "avatar_url": ""
  },
  "reviews": []
}'::jsonb;

-- 2. Create the public 'course_landing_assets' bucket for landing page banners, logos, and avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course_landing_assets',
  'course_landing_assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage RLS for course_landing_assets
DROP POLICY IF EXISTS "Allow public select on course_landing_assets" ON storage.objects;
CREATE POLICY "Allow public select on course_landing_assets"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'course_landing_assets');

DROP POLICY IF EXISTS "Allow auth insert on course_landing_assets" ON storage.objects;
CREATE POLICY "Allow auth insert on course_landing_assets"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'course_landing_assets');

DROP POLICY IF EXISTS "Allow auth update on course_landing_assets" ON storage.objects;
CREATE POLICY "Allow auth update on course_landing_assets"
  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'course_landing_assets');

DROP POLICY IF EXISTS "Allow auth delete on course_landing_assets" ON storage.objects;
CREATE POLICY "Allow auth delete on course_landing_assets"
  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'course_landing_assets');

-- 4. RLS policies for public courses, modules, and lessons select access
DROP POLICY IF EXISTS "allow_public_select_published_courses" ON public.courses;
CREATE POLICY "allow_public_select_published_courses" ON public.courses
  FOR SELECT TO anon, authenticated
  USING (published = true OR status = 'published');

DROP POLICY IF EXISTS "allow_public_select_modules_published_courses" ON public.course_modules;
CREATE POLICY "allow_public_select_modules_published_courses" ON public.course_modules
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = course_modules.course_id 
    AND (courses.published = true OR courses.status = 'published')
  ));

DROP POLICY IF EXISTS "allow_public_select_lessons_published_courses" ON public.course_lessons;
CREATE POLICY "allow_public_select_lessons_published_courses" ON public.course_lessons
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = course_lessons.course_id 
    AND (courses.published = true OR courses.status = 'published')
  ));

-- 5. RLS policy to allow public select on workspace_branding for custom domains lookup
DROP POLICY IF EXISTS "Allow public select of branding for custom domains" ON public.workspace_branding;
CREATE POLICY "Allow public select of branding for custom domains" ON public.workspace_branding
  FOR SELECT TO anon, authenticated
  USING (custom_domain IS NOT NULL);
