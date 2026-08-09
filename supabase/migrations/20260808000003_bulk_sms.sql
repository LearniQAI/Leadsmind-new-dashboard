-- BULK SMS MARKETING — Task 42
--
-- SMS consent gap: unlike email (global_suppression_list + contacts.is_invalid_email,
-- see 20240101000135_phase93_sprint2_popia_compliance.sql), there was no opt-out
-- mechanism for SMS at all prior to this migration. sms_opt_out is the phone
-- equivalent of is_invalid_email; the Twilio inbound webhook sets it on STOP.
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS sms_opt_out BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS sms_opt_out_at TIMESTAMPTZ;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS sms_opt_out BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS sms_opt_out_at TIMESTAMPTZ;

-- Bulk SMS Campaigns — one-time scheduled bulk send, not a drip/sequence
-- (Email Sequences' workflow_executions engine is the wrong shape for this;
-- see the Task 42 audit). Audience mirrors Segments' RuleGroup shape exactly,
-- resolved live at schedule time via SegmentationCompiler, same as email
-- campaigns in src/app/actions/marketing.ts.
CREATE TABLE IF NOT EXISTS public.bulk_sms_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    message_body TEXT NOT NULL,
    segment_id UUID REFERENCES public.segments(id) ON DELETE SET NULL,
    rule_group JSONB,
    tags TEXT[],
    scheduled_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled')),
    total_recipients INTEGER NOT NULL DEFAULT 0,
    total_sent INTEGER NOT NULL DEFAULT 0,
    total_failed INTEGER NOT NULL DEFAULT 0,
    total_skipped_opt_out INTEGER NOT NULL DEFAULT 0,
    sent_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bulk_sms_campaigns_workspace ON public.bulk_sms_campaigns(workspace_id);

DROP TRIGGER IF EXISTS update_bulk_sms_campaigns_updated_at ON public.bulk_sms_campaigns;
CREATE TRIGGER update_bulk_sms_campaigns_updated_at BEFORE UPDATE ON public.bulk_sms_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.bulk_sms_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace Bulk SMS Campaigns Access" ON public.bulk_sms_campaigns;
CREATE POLICY "Workspace Bulk SMS Campaigns Access" ON public.bulk_sms_campaigns
    FOR ALL USING (public.check_workspace_access(workspace_id));

-- SMS Dispatch Queue — mirrors campaign_dispatch_queue's structure exactly
-- (20240101000170_phase..._campaign_dispatch_queue.sql): same worker locking
-- RPC pattern, same status lifecycle, same backoff convention in the cron
-- worker. scheduled_for carries the campaign's chosen future send time
-- (rows are inserted with scheduled_for = campaign.scheduled_at, not NOW()),
-- which is what gives this feature real future-dated scheduling.
CREATE TABLE IF NOT EXISTS public.sms_dispatch_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.bulk_sms_campaigns(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, sent, failed, skipped_opt_out
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_log TEXT,
    twilio_sid TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (campaign_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_sms_queue_worker ON public.sms_dispatch_queue(status, scheduled_for)
    WHERE status IN ('pending', 'deferred');
CREATE INDEX IF NOT EXISTS idx_sms_queue_campaign ON public.sms_dispatch_queue(campaign_id, status);

ALTER TABLE public.sms_dispatch_queue ENABLE ROW LEVEL SECURITY;
-- No user-facing policy: written only via the admin client from server
-- actions and the cron worker, same as campaign_dispatch_queue.

-- Atomic worker locking, identical shape to acquire_campaign_jobs
-- (20240101000170_..._campaign_dispatch_queue.sql).
CREATE OR REPLACE FUNCTION acquire_sms_jobs(worker_id TEXT, batch_size INT)
RETURNS SETOF sms_dispatch_queue AS $$
DECLARE
    job_record sms_dispatch_queue%rowtype;
BEGIN
    FOR job_record IN
        SELECT * FROM sms_dispatch_queue
        WHERE status = 'pending'
          AND scheduled_for <= NOW()
          AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '5 minutes')
        ORDER BY scheduled_for ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE sms_dispatch_queue
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
