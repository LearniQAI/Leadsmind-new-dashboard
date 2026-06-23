-- Migration: Courier Tracking Extensions and Quota System

-- Part B: Confirm received column on courier_shipments
ALTER TABLE public.courier_shipments
ADD COLUMN IF NOT EXISTS received_confirmed_at TIMESTAMPTZ;

-- Part E: Brand settings recipient email alerts opt-out
ALTER TABLE public.courier_brand_settings
ADD COLUMN IF NOT EXISTS recipient_alerts_disabled BOOLEAN NOT NULL DEFAULT false;

-- Part D: plan quota system
CREATE TABLE IF NOT EXISTS public.tracking_quota (
    workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
    used_count INTEGER NOT NULL DEFAULT 0,
    period_start DATE NOT NULL DEFAULT CURRENT_DATE,
    plan_tier TEXT NOT NULL DEFAULT 'free',
    test_used BOOLEAN NOT NULL DEFAULT false, -- For Spark one-test gate
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for tracking_quota
ALTER TABLE public.tracking_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view their tracking quota"
ON public.tracking_quota FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = tracking_quota.workspace_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Service role full access to tracking quota"
ON public.tracking_quota FOR ALL USING (true);
