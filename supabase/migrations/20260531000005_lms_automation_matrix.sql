-- Migration: LMS Automation Matrix & Bundles Schema
-- File: supabase/migrations/20260531000005_lms_automation_matrix.sql

-- 1. Extend public.enrollments table
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS access_type TEXT DEFAULT 'full' CHECK (access_type IN ('full', 'audit'));
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS grace_period_expires_at TIMESTAMPTZ;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Create lms_bundles table
CREATE TABLE IF NOT EXISTS public.lms_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    course_ids UUID[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create lms_bundle_enrollments table
CREATE TABLE IF NOT EXISTS public.lms_bundle_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    bundle_id UUID NOT NULL REFERENCES public.lms_bundles(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'active', -- 'active', 'revoked', 'expired'
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(bundle_id, contact_id)
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.lms_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_bundle_enrollments ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
DO $$
BEGIN
    -- LMS Bundles Policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace isolation for lms_bundles') THEN
        CREATE POLICY "Workspace isolation for lms_bundles" ON public.lms_bundles
            FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
    END IF;

    -- LMS Bundle Enrollments Policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace isolation for lms_bundle_enrollments') THEN
        CREATE POLICY "Workspace isolation for lms_bundle_enrollments" ON public.lms_bundle_enrollments
            FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
    END IF;
END $$;

-- 6. Indexes for Optimization
CREATE INDEX IF NOT EXISTS idx_lms_bundles_workspace ON public.lms_bundles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_lms_bundle_enrollments_contact ON public.lms_bundle_enrollments(contact_id);
CREATE INDEX IF NOT EXISTS idx_lms_bundle_enrollments_bundle ON public.lms_bundle_enrollments(bundle_id);
