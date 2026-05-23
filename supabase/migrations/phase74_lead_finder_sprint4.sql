-- Migration: Lead Finder Sprint 4 - Contact Intelligence

CREATE TABLE IF NOT EXISTS public.lead_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID REFERENCES public.lead_finder_results(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    title TEXT,
    department TEXT,
    email TEXT,
    phone TEXT,
    linkedin_url TEXT,
    confidence_score INTEGER DEFAULT 0, -- 1-100
    confidence_level TEXT DEFAULT 'Low', -- High, Medium, Low
    status TEXT DEFAULT 'New', -- New, Contacted, Qualified, Disqualified
    owner_id UUID REFERENCES auth.users(id),
    pipeline_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES public.lead_contacts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES public.lead_contacts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.lead_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_activities ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lead_contacts_result_id ON public.lead_contacts(result_id);

CREATE POLICY "Users can manage their own lead contacts" 
ON public.lead_contacts FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own contact notes" 
ON public.contact_notes FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.lead_contacts c 
        WHERE c.id = contact_id AND c.user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage their own contact activities" 
ON public.contact_activities FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.lead_contacts c 
        WHERE c.id = contact_id AND c.user_id = auth.uid()
    )
);
