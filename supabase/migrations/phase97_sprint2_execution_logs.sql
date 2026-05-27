-- Up Migration
CREATE TYPE content_gen_enum AS ENUM (
    'blog_post', 'email_campaign', 'email_subject', 'social_post', 
    'sms', 'whatsapp', 'sales_email', 'funnel_copy', 
    'course_description', 'outreach_sequence', 'content_improvement'
);

CREATE TABLE IF NOT EXISTS public.ai_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL,
    generation_type content_gen_enum NOT NULL,
    content_type_context VARCHAR(255), 
    user_brief TEXT NOT NULL,
    model_used VARCHAR(50) NOT NULL,
    tokens_used INT NOT NULL DEFAULT 0,
    output_content TEXT NOT NULL,
    was_inserted BOOLEAN DEFAULT FALSE NOT NULL,
    was_edited_before_insert BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_generations_analytics ON public.ai_generations(workspace_id, generation_type);

-- RLS Policies
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace access for generations" ON public.ai_generations;
CREATE POLICY "Workspace access for generations" ON public.ai_generations 
    FOR ALL USING (check_workspace_access(workspace_id));
