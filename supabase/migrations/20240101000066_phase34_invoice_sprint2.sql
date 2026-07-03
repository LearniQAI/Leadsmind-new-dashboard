-- Sprint 2: Multi-Channel Queue & Asset Portal

-- 1. Table invoice_attachments
CREATE TABLE IF NOT EXISTS invoice_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for invoice_attachments
ALTER TABLE invoice_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments for their workspace"
    ON invoice_attachments FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert attachments for their workspace"
    ON invoice_attachments FOR INSERT
    WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete attachments for their workspace"
    ON invoice_attachments FOR DELETE
    USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- 2. Table invoice_delivery_queue
DO $$ BEGIN
    CREATE TYPE delivery_channel AS ENUM ('email', 'sms', 'whatsapp');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS invoice_delivery_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id),
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
    channel delivery_channel NOT NULL DEFAULT 'email',
    status delivery_status NOT NULL DEFAULT 'pending',
    payload JSONB, -- Stores metadata like target email/phone, subject, etc.
    error_log TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for invoice_delivery_queue
ALTER TABLE invoice_delivery_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage delivery queue for their workspace"
    ON invoice_delivery_queue FOR ALL
    USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- 3. Automated Scheduling Runner (Cron)
-- This requires pg_cron extension to be enabled in your Supabase project.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the runner every 5 minutes
-- Note: Replace 'your-edge-function-url' and 'your-service-role-key' with actual values
-- SELECT cron.schedule('invoice-delivery-job', '*/5 * * * *', $$
--   SELECT net.http_post(
--     url:='https://<project-ref>.supabase.co/functions/v1/process-invoice-queue',
--     headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
--     body:='{}'::jsonb
--   );
-- $$);

-- 4. Storage Bucket Configuration (Manual step reminder)
-- Create a storage bucket named 'invoice-attachments' in the Supabase dashboard
-- and set appropriate access policies for authenticated workspace members.