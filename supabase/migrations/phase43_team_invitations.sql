-- PHASE 43: TEAM INVITATIONS SYSTEM
-- Create workspace_invitations table for team collaboration

CREATE TABLE IF NOT EXISTS public.workspace_invitations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email           TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'client')),
    invited_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    expires_at      TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
    status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    UNIQUE(workspace_id, email)
);

-- RLS
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace admins can manage invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.workspace_invitations;

CREATE POLICY "Workspace admins can manage invitations"
    ON public.workspace_invitations FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can view their own invitations"
    ON public.workspace_invitations FOR SELECT
    USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON public.workspace_invitations(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace ON public.workspace_invitations(workspace_id);
