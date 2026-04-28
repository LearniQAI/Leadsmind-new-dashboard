-- 1. Upgrade lessons table with advanced content fields
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS content_type TEXT CHECK (content_type IN ('video', 'pdf', 'youtube', 'text', 'quiz')) DEFAULT 'text',
ADD COLUMN IF NOT EXISTS content_html TEXT,
ADD COLUMN IF NOT EXISTS video_path TEXT,
ADD COLUMN IF NOT EXISTS pdf_path TEXT,
ADD COLUMN IF NOT EXISTS youtube_url TEXT,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_preview BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS video_thumbnail_path TEXT;

-- 2. Create the 'lms_content' bucket for course assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('lms_content', 'lms_content', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage RLS for lms_content
CREATE POLICY "Users can view course content"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'lms_content');

CREATE POLICY "Users can upload course content"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lms_content' 
  AND (storage.foldername(name))[1] IN (
    SELECT workspace_id::text FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete course content"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lms_content' 
  AND (storage.foldername(name))[1] IN (
    SELECT workspace_id::text FROM workspace_members WHERE user_id = auth.uid()
  )
);
