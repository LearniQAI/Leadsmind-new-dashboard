-- Add missing automation columns to workspaces table
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS resend_api_key TEXT,
ADD COLUMN IF NOT EXISTS email_from_name TEXT DEFAULT 'Leadsmind Sales',
ADD COLUMN IF NOT EXISTS email_from_address TEXT,
ADD COLUMN IF NOT EXISTS twilio_sid TEXT,
ADD COLUMN IF NOT EXISTS twilio_token TEXT,
ADD COLUMN IF NOT EXISTS twilio_number TEXT;

-- Create Forms Table for Lead Capture
CREATE TABLE IF NOT EXISTS public.forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    fields JSONB NOT NULL DEFAULT '[
        {"label": "First Name", "name": "firstName", "type": "text", "required": true},
        {"label": "Email", "name": "email", "type": "email", "required": true}
    ]',
    success_message TEXT DEFAULT 'Thank you for your submission!',
    redirect_url TEXT,
    button_text TEXT DEFAULT 'Submit',
    theme_color TEXT DEFAULT '#2563eb',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Forms
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage forms" ON public.forms 
FOR ALL USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Add Trigger for updated_at if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_forms_updated_at ON forms;
CREATE TRIGGER update_forms_updated_at
    BEFORE UPDATE ON forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
