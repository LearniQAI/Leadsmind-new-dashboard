
-- Add 'tiktok' to platform constraints
ALTER TABLE platform_connections DROP CONSTRAINT IF EXISTS platform_connections_platform_check;
ALTER TABLE platform_connections ADD CONSTRAINT platform_connections_platform_check 
    CHECK (platform IN ('email', 'sms', 'whatsapp', 'instagram', 'linkedin', 'facebook', 'tiktok'));

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_platform_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_platform_check 
    CHECK (platform IN ('email', 'sms', 'whatsapp', 'instagram', 'linkedin', 'facebook', 'tiktok'));

-- Create social_posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    platforms TEXT[] NOT NULL DEFAULT '{}',
    media_urls TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for social_posts
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access for social_posts" ON social_posts
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Indexing
CREATE INDEX IF NOT EXISTS idx_social_posts_workspace_id ON social_posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
