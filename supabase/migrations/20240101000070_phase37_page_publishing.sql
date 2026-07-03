-- Add rendered_html and seo_data to pages table
ALTER TABLE public.pages 
ADD COLUMN IF NOT EXISTS rendered_html TEXT,
ADD COLUMN IF NOT EXISTS seo_data JSONB DEFAULT '{}';

-- Index for public route lookups
CREATE INDEX IF NOT EXISTS idx_pages_workspace_page_slug ON public.pages(workspace_id, website_page_id, funnel_step_id);
