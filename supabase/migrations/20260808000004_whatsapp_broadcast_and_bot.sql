-- WHATSAPP BROADCAST LISTS + AUTOMATED REPLIES — Task 43
--
-- Builds on the Meta Cloud API WhatsApp integration (platform_connections /
-- MetaAdapter / webhooks/meta/route.ts), NOT the Twilio WhatsApp automation
-- actions — see the Task 43 audit: Meta is the path with a real inbound
-- pipeline, real OAuth-connected business accounts, and the compliance
-- fields (contacts.opted_in/opted_out) already wired up on every inbound
-- WhatsApp message via processInboundComplianceAndWindow().
--
-- Consent gate is contacts.opted_out (NOT sms_opt_out — that's the Twilio/
-- Bulk SMS field and is a different regulatory channel).

-- Broadcast campaigns — one-time scheduled bulk send, same shape as
-- bulk_sms_campaigns (20260808000003_bulk_sms.sql), with two additions the
-- SMS analog doesn't need: a template alternative to the free-text body
-- (WhatsApp requires a pre-approved template to message a contact outside
-- the 24h customer-service window; free text is only legal inside it), and
-- a skipped-no-template counter distinct from skipped-opt-out.
CREATE TABLE IF NOT EXISTS public.whatsapp_broadcast_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    message_body TEXT, -- sent as free text to contacts inside the 24h session window
    template_name TEXT, -- pre-approved WABA template name, required for out-of-window contacts
    template_language TEXT DEFAULT 'en_US',
    template_body_params JSONB, -- ordered array of param strings, contact tokens resolved at send time
    segment_id UUID REFERENCES public.segments(id) ON DELETE SET NULL,
    rule_group JSONB,
    tags TEXT[],
    scheduled_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled')),
    total_recipients INTEGER NOT NULL DEFAULT 0,
    total_sent INTEGER NOT NULL DEFAULT 0,
    total_failed INTEGER NOT NULL DEFAULT 0,
    total_skipped_opt_out INTEGER NOT NULL DEFAULT 0,
    total_skipped_no_template INTEGER NOT NULL DEFAULT 0,
    sent_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT whatsapp_broadcast_has_content CHECK (message_body IS NOT NULL OR template_name IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcast_campaigns_workspace ON public.whatsapp_broadcast_campaigns(workspace_id);

DROP TRIGGER IF EXISTS update_whatsapp_broadcast_campaigns_updated_at ON public.whatsapp_broadcast_campaigns;
CREATE TRIGGER update_whatsapp_broadcast_campaigns_updated_at BEFORE UPDATE ON public.whatsapp_broadcast_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.whatsapp_broadcast_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace WhatsApp Broadcast Campaigns Access" ON public.whatsapp_broadcast_campaigns;
CREATE POLICY "Workspace WhatsApp Broadcast Campaigns Access" ON public.whatsapp_broadcast_campaigns
    FOR ALL USING (public.check_workspace_access(workspace_id));

-- Dispatch queue — identical locking/reliability shape to sms_dispatch_queue,
-- swapping twilio_sid for whatsapp_message_id and adding was_template so the
-- send history records which branch (free text vs. template) actually fired
-- per contact.
CREATE TABLE IF NOT EXISTS public.whatsapp_dispatch_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.whatsapp_broadcast_campaigns(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, sent, failed, skipped_opt_out, skipped_no_template
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_log TEXT,
    whatsapp_message_id TEXT,
    was_template BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (campaign_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_worker ON public.whatsapp_dispatch_queue(status, scheduled_for)
    WHERE status IN ('pending', 'deferred');
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_campaign ON public.whatsapp_dispatch_queue(campaign_id, status);

ALTER TABLE public.whatsapp_dispatch_queue ENABLE ROW LEVEL SECURITY;
-- No user-facing policy: written only via the admin client from server
-- actions and the cron worker, same as sms_dispatch_queue/campaign_dispatch_queue.

-- Atomic worker locking, identical shape to acquire_sms_jobs.
CREATE OR REPLACE FUNCTION acquire_whatsapp_jobs(worker_id TEXT, batch_size INT)
RETURNS SETOF whatsapp_dispatch_queue AS $$
DECLARE
    job_record whatsapp_dispatch_queue%rowtype;
BEGIN
    FOR job_record IN
        SELECT * FROM whatsapp_dispatch_queue
        WHERE status = 'pending'
          AND scheduled_for <= NOW()
          AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '5 minutes')
        ORDER BY scheduled_for ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE whatsapp_dispatch_queue
        SET status = 'processing',
            locked_at = NOW(),
            locked_by = worker_id,
            updated_at = NOW()
        WHERE id = job_record.id
        RETURNING * INTO job_record;

        RETURN NEXT job_record;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Automated replies (keyword-trigger chatbot) — matched against inbound
-- WhatsApp text in webhooks/meta/route.ts's handleWhatsAppMessage(), after
-- the existing STOP/START compliance check (never auto-reply to someone who
-- just opted out, and never to someone already opted out). A reply fires
-- because the contact just messaged in, so it is always inside the 24h
-- session window — reply_type='template' is offered anyway for cases where a
-- workspace prefers a formatted/pre-approved message even in-window, not
-- because it's required.
CREATE TABLE IF NOT EXISTS public.whatsapp_bot_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    match_type TEXT NOT NULL DEFAULT 'contains' CHECK (match_type IN ('exact', 'contains', 'regex')),
    match_value TEXT NOT NULL,
    reply_type TEXT NOT NULL DEFAULT 'text' CHECK (reply_type IN ('text', 'template')),
    reply_text TEXT,
    reply_template_name TEXT,
    reply_template_language TEXT DEFAULT 'en_US',
    reply_template_params JSONB,
    priority INTEGER NOT NULL DEFAULT 0, -- lower number = evaluated first; first match wins
    active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT whatsapp_bot_rule_has_reply CHECK (
        (reply_type = 'text' AND reply_text IS NOT NULL)
        OR (reply_type = 'template' AND reply_template_name IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_bot_rules_workspace_active ON public.whatsapp_bot_rules(workspace_id, active, priority);

DROP TRIGGER IF EXISTS update_whatsapp_bot_rules_updated_at ON public.whatsapp_bot_rules;
CREATE TRIGGER update_whatsapp_bot_rules_updated_at BEFORE UPDATE ON public.whatsapp_bot_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.whatsapp_bot_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace WhatsApp Bot Rules Access" ON public.whatsapp_bot_rules;
CREATE POLICY "Workspace WhatsApp Bot Rules Access" ON public.whatsapp_bot_rules
    FOR ALL USING (public.check_workspace_access(workspace_id));
