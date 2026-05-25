-- Migration: Lead Finder Sprint 3 - Operational Workspace

-- 1. Qualification Status & Smart Tags on Results
ALTER TABLE public.lead_finder_results
ADD COLUMN qualification_status TEXT DEFAULT 'New', -- New, Qualified, Contacted, Interested, Unqualified
ADD COLUMN owner_id UUID REFERENCES auth.users(id),
ADD COLUMN smart_tags TEXT[] DEFAULT '{}',
ADD COLUMN pipeline_id UUID, -- For direct link to CRM pipeline
ADD COLUMN pipeline_stage_id UUID;

-- 2. Lead Notes
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID REFERENCES public.lead_finder_results(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Lead Activity Timeline
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID REFERENCES public.lead_finder_results(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- 'status_change', 'note_added', 'crm_push', 'enrichment', 'tag_added'
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own lead notes" 
ON public.lead_notes FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.lead_finder_results r 
        WHERE r.id = result_id AND r.user_id = auth.uid()
    )
);

CREATE POLICY "Users can view their own lead activities" 
ON public.lead_activities FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.lead_finder_results r 
        WHERE r.id = result_id AND r.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own lead activities" 
ON public.lead_activities FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.lead_finder_results r 
        WHERE r.id = result_id AND r.user_id = auth.uid()
    )
);
