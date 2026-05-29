CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    sender_type TEXT CHECK (sender_type IN ('customer', 'agent', 'system')) NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    is_internal_note BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view messages in their workspace"
    ON public.support_ticket_messages FOR SELECT
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert messages in their workspace"
    ON public.support_ticket_messages FOR INSERT
    WITH CHECK (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their own messages"
    ON public.support_ticket_messages FOR UPDATE
    USING (
        sender_id = auth.uid() AND 
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete their own messages"
    ON public.support_ticket_messages FOR DELETE
    USING (
        sender_id = auth.uid() AND 
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

-- Trigger for updated_at
CREATE TRIGGER update_support_ticket_messages_updated_at
    BEFORE UPDATE ON public.support_ticket_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
