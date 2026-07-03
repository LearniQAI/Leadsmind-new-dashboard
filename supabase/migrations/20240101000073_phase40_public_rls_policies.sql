-- Enable RLS on analytics and submissions
ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert analytics (Page Views)
DROP POLICY IF EXISTS "Public can insert analytics" ON public.page_analytics;
CREATE POLICY "Public can insert analytics" ON public.page_analytics
    FOR INSERT 
    WITH CHECK (true);

-- Allow anyone to insert submissions (Form Leads)
DROP POLICY IF EXISTS "Public can insert submissions" ON public.page_submissions;
CREATE POLICY "Public can insert submissions" ON public.page_submissions
    FOR INSERT 
    WITH CHECK (true);

-- Ensure workspace isolation for reading (Workspace members only)
DROP POLICY IF EXISTS "Users can view their workspace analytics" ON public.page_analytics;
CREATE POLICY "Users can view their workspace analytics" ON public.page_analytics
    FOR SELECT
    USING (auth.uid() IN (
        SELECT user_id FROM workspace_members WHERE workspace_id = page_analytics.workspace_id
    ));
