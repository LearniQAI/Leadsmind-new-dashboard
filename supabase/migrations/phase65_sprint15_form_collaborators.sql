-- Create form_collaborators table to track persistent form access permissions

CREATE TABLE IF NOT EXISTS public.form_collaborators (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id         UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    invited_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email           TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('editor', 'viewer')) DEFAULT 'editor',
    status          TEXT NOT NULL CHECK (status IN ('pending', 'active')) DEFAULT 'pending',
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(form_id, email)
);

-- Enable Row Level Security
ALTER TABLE public.form_collaborators ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated to view collaborations" ON public.form_collaborators;
DROP POLICY IF EXISTS "Allow authenticated to manage collaborations" ON public.form_collaborators;

-- Create open policies for authenticated users
CREATE POLICY "Allow authenticated to view collaborations"
    ON public.form_collaborators FOR SELECT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated to manage collaborations"
    ON public.form_collaborators FOR ALL
    USING (auth.uid() IS NOT NULL);
