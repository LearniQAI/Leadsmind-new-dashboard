-- Task 99: AI Landing Page Copy Generator
-- Same shape/rationale as video_script_generations: append-only generation
-- history with structured JSONB output, read-only RLS (writes only via the
-- API route's service-role client).
CREATE TABLE IF NOT EXISTS public.landing_page_copy_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_by UUID,
    input_params JSONB NOT NULL,
    generated_copy JSONB NOT NULL,
    model_used VARCHAR(50) NOT NULL,
    tokens_used INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_landing_page_copy_generations_workspace_created
    ON public.landing_page_copy_generations(workspace_id, created_at DESC);

ALTER TABLE public.landing_page_copy_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace read access for landing_page_copy_generations" ON public.landing_page_copy_generations;
CREATE POLICY "Workspace read access for landing_page_copy_generations" ON public.landing_page_copy_generations
    FOR SELECT USING (check_workspace_access(workspace_id));
