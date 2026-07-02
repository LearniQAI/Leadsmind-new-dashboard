-- Sprint 11-13: Recording, Transcription & Core Automation

-- 1. Alter appointments table to add reminder tracking columns
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT false;

-- 2. Create meet_transcripts table
CREATE TABLE IF NOT EXISTS public.meet_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE UNIQUE,
    transcript_text TEXT NOT NULL,
    diarized_content JSONB NOT NULL DEFAULT '[]',
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS and add workspace access check policy
ALTER TABLE public.meet_transcripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace access for meet_transcripts" ON public.meet_transcripts;
CREATE POLICY "Workspace access for meet_transcripts" ON public.meet_transcripts
    FOR ALL USING (check_workspace_access(workspace_id));

CREATE INDEX IF NOT EXISTS idx_transcripts_appointment ON public.meet_transcripts(appointment_id);

