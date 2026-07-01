-- Migration: Phase 83 - Team Collaboration & Workspace Governance

-- 1. Workspace Teams
-- Grouping users into operational teams
CREATE TABLE IF NOT EXISTS public.workspace_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Team Members mapping
CREATE TABLE IF NOT EXISTS public.workspace_team_members (
    team_id UUID REFERENCES public.workspace_teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY(team_id, user_id)
);

-- 2. Workspace Roles & Permissions
-- Define explicit RBAC roles (Owner, Admin, Manager, Sales Rep, Viewer)
CREATE TABLE IF NOT EXISTS public.workspace_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspace_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES public.workspace_roles(id) ON DELETE CASCADE,
    resource TEXT NOT NULL, -- 'crm', 'leads_finder', 'analytics', 'workflows', 'tasks'
    action TEXT NOT NULL, -- 'create', 'read', 'update', 'delete', 'manage'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- We assume public.workspace_members is the root mapping. We can add role_id to it safely.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_members' AND column_name = 'role_id') THEN
        ALTER TABLE public.workspace_members ADD COLUMN role_id UUID REFERENCES public.workspace_roles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Workspace Invites
CREATE TABLE IF NOT EXISTS public.workspace_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role_id UUID REFERENCES public.workspace_roles(id) ON DELETE SET NULL,
    team_id UUID REFERENCES public.workspace_teams(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'revoked'
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Workspace Audit Logs
-- Operational tracking for governance
CREATE TABLE IF NOT EXISTS public.workspace_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Approval Requests
-- Lightweight pipeline/assignment approval flows
CREATE TABLE IF NOT EXISTS public.approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    request_type TEXT NOT NULL, -- 'pipeline_move', 'reassignment', 'automation'
    target_entity_id UUID NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- 6. Collaboration Comments
CREATE TABLE IF NOT EXISTS public.collaboration_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL, -- 'opportunity', 'customer', 'task'
    entity_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.workspace_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_comments ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace ON public.workspace_audit_logs(workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_approval_requests_approver ON public.approval_requests(approver_id, status);
CREATE INDEX IF NOT EXISTS idx_collab_comments_entity ON public.collaboration_comments(entity_id);

-- Workspace Isolation Policies
CREATE POLICY "Workspace isolation for workspace_teams" ON public.workspace_teams FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

CREATE POLICY "Workspace isolation for workspace_team_members" ON public.workspace_team_members FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workspace_teams t WHERE t.id = team_id AND t.workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
);

CREATE POLICY "Workspace isolation for workspace_roles" ON public.workspace_roles FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

CREATE POLICY "Workspace isolation for workspace_permissions" ON public.workspace_permissions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workspace_roles r WHERE r.id = role_id AND r.workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
);

CREATE POLICY "Workspace isolation for workspace_invites" ON public.workspace_invites FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

CREATE POLICY "Workspace isolation for workspace_audit_logs" ON public.workspace_audit_logs FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

CREATE POLICY "Workspace isolation for approval_requests" ON public.approval_requests FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

CREATE POLICY "Workspace isolation for collaboration_comments" ON public.collaboration_comments FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);
