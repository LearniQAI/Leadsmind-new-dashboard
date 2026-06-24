-- Migration: Webhook Subscriptions for Zapier and REST Hooks
CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    target_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Workspace members can view webhook subscriptions" ON public.webhook_subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = webhook_subscriptions.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Workspace members can insert webhook subscriptions" ON public.webhook_subscriptions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = webhook_subscriptions.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Workspace members can update webhook subscriptions" ON public.webhook_subscriptions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = webhook_subscriptions.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Workspace members can delete webhook subscriptions" ON public.webhook_subscriptions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = webhook_subscriptions.workspace_id
            AND wm.user_id = auth.uid()
        )
    );
