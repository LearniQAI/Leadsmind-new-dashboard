CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a bucket for general media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  104857600, -- 100MB limit
  ARRAY[
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/ogg',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Policies for the media bucket
CREATE POLICY "Users can upload media to their workspace folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = (SELECT workspace_id::text FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can view media in their workspace"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = (SELECT workspace_id::text FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update media in their workspace"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = (SELECT workspace_id::text FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete media in their workspace"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = (SELECT workspace_id::text FROM profiles WHERE id = auth.uid())
);

-- Table to track file metadata and virtual folders
CREATE TABLE IF NOT EXISTS public.media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL, -- Full path in storage bucket
  type TEXT NOT NULL, -- 'file' or 'folder'
  mime_type TEXT,
  size BIGINT,
  parent_id UUID REFERENCES public.media_files(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index for faster lookups
CREATE INDEX idx_media_files_workspace_id ON public.media_files(workspace_id);
CREATE INDEX idx_media_files_parent_id ON public.media_files(parent_id);

-- RLS for media_files table
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view media_files in their workspace"
ON public.media_files FOR SELECT
TO authenticated
USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert media_files in their workspace"
ON public.media_files FOR INSERT
TO authenticated
WITH CHECK (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update media_files in their workspace"
ON public.media_files FOR UPDATE
TO authenticated
USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete media_files in their workspace"
ON public.media_files FOR DELETE
TO authenticated
USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

-- Global Search Index on media_files
-- (In a real app, we might use pg_trgm or full-text search)
CREATE INDEX idx_media_files_name_trgm ON public.media_files USING gin (name gin_trgm_ops);

-- Contact Vault: link media_files to contacts
CREATE TABLE IF NOT EXISTS public.contact_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.media_files(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'document', -- 'contract', 'brief', 'other'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contact_id, file_id)
);

ALTER TABLE public.contact_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contact_documents in their workspace"
ON public.contact_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = contact_documents.contact_id
    AND c.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert contact_documents in their workspace"
ON public.contact_documents FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = contact_documents.contact_id
    AND c.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  )
);

