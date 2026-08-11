
-- Storage bucket for social-post media uploads (images + video), needed for TikTok/YouTube
-- publishing which require real video files, not just a pasted URL. Mirrors the blog-media
-- bucket pattern (20240101000081_phase47_blog_posts_sprint1.sql) with a larger size limit and
-- video mime types added.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('social-media', 'social-media', true, 524288000, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Social Media Access" ON storage.objects;
CREATE POLICY "Public Social Media Access" ON storage.objects
    FOR SELECT USING (bucket_id = 'social-media');

DROP POLICY IF EXISTS "Auth Social Media Upload" ON storage.objects;
CREATE POLICY "Auth Social Media Upload" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'social-media');

DROP POLICY IF EXISTS "Auth Social Media Update" ON storage.objects;
CREATE POLICY "Auth Social Media Update" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'social-media');

DROP POLICY IF EXISTS "Auth Social Media Delete" ON storage.objects;
CREATE POLICY "Auth Social Media Delete" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'social-media');
