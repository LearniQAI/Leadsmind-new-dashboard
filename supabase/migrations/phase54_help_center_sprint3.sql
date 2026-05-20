-- Phase 54: Sprint 3 Help Center - Screenshot Freshness & Contextual Mappings

-- 1. Extend help_screenshots table with routing and selector tracking
ALTER TABLE public.help_screenshots ADD COLUMN IF NOT EXISTS route_path TEXT;
ALTER TABLE public.help_screenshots ADD COLUMN IF NOT EXISTS selector TEXT;
ALTER TABLE public.help_screenshots ADD COLUMN IF NOT EXISTS stored_hash TEXT;

-- 2. Create help_update_queue table to log visual regression alerts
CREATE TABLE IF NOT EXISTS public.help_update_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screenshot_id UUID REFERENCES public.help_screenshots(id) ON DELETE CASCADE,
    route_path TEXT NOT NULL,
    selector TEXT NOT NULL,
    expected_hash TEXT,
    actual_hash TEXT,
    status TEXT CHECK (status IN ('pending', 'resolved', 'ignored')) DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.help_update_queue ENABLE ROW LEVEL SECURITY;

-- 4. Set RLS Policies
DROP POLICY IF EXISTS "Public Read Access on help_update_queue" ON public.help_update_queue;
CREATE POLICY "Public Read Access on help_update_queue" 
    ON public.help_update_queue FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Administrative Write Access on help_update_queue" ON public.help_update_queue;
CREATE POLICY "Administrative Write Access on help_update_queue" 
    ON public.help_update_queue FOR ALL 
    USING (true);
