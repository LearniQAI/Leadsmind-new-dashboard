-- Create ticket_attachments table
CREATE TABLE IF NOT EXISTS public.ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.support_ticket_messages(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view attachments in their workspace"
    ON public.ticket_attachments FOR SELECT
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert attachments in their workspace"
    ON public.ticket_attachments FOR INSERT
    WITH CHECK (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their own attachments"
    ON public.ticket_attachments FOR DELETE
    USING (
        uploaded_by = auth.uid() AND 
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

-- Create Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('support-ticket-files', 'support-ticket-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Workspace members can read support files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'support-ticket-files' AND
        (auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id::text = (storage.foldername(name))[1]
        ))
    );

CREATE POLICY "Workspace members can insert support files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'support-ticket-files' AND
        (auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id::text = (storage.foldername(name))[1]
        ))
    );
