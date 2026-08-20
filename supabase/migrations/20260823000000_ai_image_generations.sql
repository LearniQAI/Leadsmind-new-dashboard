-- Task 97: AI Image/Graphic Generation
-- Unlike the text-based generators (revenue_forecasts, campaign_recommendations,
-- video_script_generations, landing_page_copy_generations, ad_copy_generations),
-- rows here are only ever inserted AFTER the generated image has been uploaded
-- to Storage and its public URL confirmed retrievable — there is no async job
-- worker, so 'status' only ever lands as 'completed' in practice; a failed
-- generation/upload is never persisted at all (same "don't record fake
-- success" behavior as the other generators, which also skip inserting on
-- failure). The status column exists for schema future-proofing if a
-- background/job-based image pipeline is ever added.
CREATE TABLE IF NOT EXISTS public.ai_image_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_by UUID,
    prompt TEXT NOT NULL,
    style_params JSONB NOT NULL DEFAULT '{}'::JSONB,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
    model_used VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_image_generations_workspace_created
    ON public.ai_image_generations(workspace_id, created_at DESC);

ALTER TABLE public.ai_image_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace read access for ai_image_generations" ON public.ai_image_generations;
CREATE POLICY "Workspace read access for ai_image_generations" ON public.ai_image_generations
    FOR SELECT USING (check_workspace_access(workspace_id));

-- Storage bucket — same pattern as social-media/blog-media: public-read (generated
-- images need to be embeddable in published posts/pages), writes restricted to
-- authenticated users, workspace-scoping enforced by the app's folder-path
-- convention (${workspaceId}/...) rather than a Storage-level RLS predicate,
-- matching the existing bucket policies exactly.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ai-generated-media', 'ai-generated-media', true, 20971520, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public AI Generated Media Access" ON storage.objects;
CREATE POLICY "Public AI Generated Media Access" ON storage.objects
    FOR SELECT USING (bucket_id = 'ai-generated-media');

DROP POLICY IF EXISTS "Auth AI Generated Media Upload" ON storage.objects;
CREATE POLICY "Auth AI Generated Media Upload" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ai-generated-media');

DROP POLICY IF EXISTS "Auth AI Generated Media Update" ON storage.objects;
CREATE POLICY "Auth AI Generated Media Update" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'ai-generated-media');

DROP POLICY IF EXISTS "Auth AI Generated Media Delete" ON storage.objects;
CREATE POLICY "Auth AI Generated Media Delete" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'ai-generated-media');
