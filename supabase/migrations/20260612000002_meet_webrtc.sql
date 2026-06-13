-- Phase 3: WebRTC Video Conferencing & Analytics

-- 1. Create meet_attendance_logs table
CREATE TABLE IF NOT EXISTS public.meet_attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    participant_name TEXT NOT NULL,
    participant_email TEXT,
    joined_at TIMESTAMPTZ DEFAULT now(),
    left_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS and add workspace access check policy
ALTER TABLE public.meet_attendance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace access for meet_attendance_logs" ON public.meet_attendance_logs;
CREATE POLICY "Workspace access for meet_attendance_logs" ON public.meet_attendance_logs
    FOR ALL USING (check_workspace_access(workspace_id));

-- Add public read and write capability for logs so meeting participants can log entry
DROP POLICY IF EXISTS "Public access for meet_attendance_logs" ON public.meet_attendance_logs;
CREATE POLICY "Public access for meet_attendance_logs" ON public.meet_attendance_logs
    FOR ALL USING (true);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_logs_appointment ON public.meet_attendance_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_workspace ON public.meet_attendance_logs(workspace_id);
