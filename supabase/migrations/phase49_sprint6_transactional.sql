-- Sprint 6: Transactional Workflow Capabilities

-- 1. Add transactional columns to form_submissions
ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS transaction_status TEXT DEFAULT 'pending';

-- 2. Create Storage Bucket for form uploads if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'form_uploads',
  'form_uploads',
  false, -- private by default, accessed via signed URLs
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv', 'application/zip']::text[]
)
ON CONFLICT (id) DO UPDATE SET 
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv', 'application/zip']::text[];

-- 3. Set up Storage Policies for form_uploads bucket
-- Note: In a real production setup, RLS policies would strictly limit access to workspace members and the specific form submission.
-- For this scaffolding, we allow authenticated users to upload and read.
CREATE POLICY "Allow authenticated uploads to form_uploads"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'form_uploads');

CREATE POLICY "Allow authenticated read access to form_uploads"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'form_uploads');

-- 4. Add transactional config scaffolding to forms
-- (We will store payment blocks config in forms.config -> 'payment' JSON)
