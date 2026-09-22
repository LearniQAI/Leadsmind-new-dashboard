-- 1. Race-free campaign totals for SMS and WhatsApp.
--
-- Both dispatch workers kept a campaign's totals by READ-THEN-WRITE (select the counter, add this
-- batch's number, write it back), so two workers finishing batches of the same campaign at once
-- overwrote each other and increments were lost. (Email avoids this with atomic increment RPCs.)
-- Recomputing in application code was no better: two workers can each count, then write, in the
-- wrong order and leave the OLDER count behind.
--
-- These functions take the campaign row's lock FIRST (FOR UPDATE) and only then count the queue rows
-- and write the totals, all in one transaction. Concurrent refreshes for a campaign therefore run one
-- at a time, and the last one to run counts after every earlier one has committed. The totals are
-- derived from the queue rows (the source of truth), so they cannot drift if a worker crashes between
-- updating a row and updating a counter, and calling the function twice is harmless.
-- SECURITY INVOKER, service-role only (called by the cron workers).

CREATE OR REPLACE FUNCTION public.refresh_sms_campaign_totals(p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sent int; v_failed int; v_skipped int; v_cancelled int; v_open int;
BEGIN
    PERFORM 1 FROM public.bulk_sms_campaigns WHERE id = p_campaign_id FOR UPDATE;
    IF NOT FOUND THEN RETURN NULL; END IF;

    -- Counted AFTER the lock is held: each statement in a READ COMMITTED function sees a fresh snapshot.
    SELECT count(*) FILTER (WHERE status = 'sent'),
           count(*) FILTER (WHERE status = 'failed'),
           count(*) FILTER (WHERE status = 'skipped_opt_out'),
           count(*) FILTER (WHERE status = 'cancelled'),
           count(*) FILTER (WHERE status IN ('pending', 'processing', 'deferred'))
    INTO v_sent, v_failed, v_skipped, v_cancelled, v_open
    FROM public.sms_dispatch_queue WHERE campaign_id = p_campaign_id;

    UPDATE public.bulk_sms_campaigns
    SET total_sent = v_sent, total_failed = v_failed, total_skipped_opt_out = v_skipped
    WHERE id = p_campaign_id;

    RETURN jsonb_build_object('sent', v_sent, 'failed', v_failed, 'skipped_opt_out', v_skipped, 'cancelled', v_cancelled, 'open', v_open);
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_whatsapp_campaign_totals(p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sent int; v_failed int; v_skipped int; v_no_template int; v_open int;
BEGIN
    PERFORM 1 FROM public.whatsapp_broadcast_campaigns WHERE id = p_campaign_id FOR UPDATE;
    IF NOT FOUND THEN RETURN NULL; END IF;

    SELECT count(*) FILTER (WHERE status = 'sent'),
           count(*) FILTER (WHERE status = 'failed'),
           count(*) FILTER (WHERE status = 'skipped_opt_out'),
           count(*) FILTER (WHERE status = 'skipped_no_template'),
           count(*) FILTER (WHERE status IN ('pending', 'processing', 'deferred'))
    INTO v_sent, v_failed, v_skipped, v_no_template, v_open
    FROM public.whatsapp_dispatch_queue WHERE campaign_id = p_campaign_id;

    UPDATE public.whatsapp_broadcast_campaigns
    SET total_sent = v_sent, total_failed = v_failed,
        total_skipped_opt_out = v_skipped, total_skipped_no_template = v_no_template
    WHERE id = p_campaign_id;

    RETURN jsonb_build_object('sent', v_sent, 'failed', v_failed, 'skipped_opt_out', v_skipped, 'skipped_no_template', v_no_template, 'open', v_open);
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_sms_campaign_totals(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_sms_campaign_totals(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.refresh_whatsapp_campaign_totals(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_whatsapp_campaign_totals(uuid) TO service_role;

-- 2. Send marker for duplicate-send protection on SMS.
-- Twilio offers no idempotency key for message creation, so a worker crash AFTER Twilio accepted a
-- message but BEFORE the row was marked sent means the reclaimed row would text the recipient again.
-- The worker now stamps the row (first attempt only) immediately BEFORE it calls Twilio; on any
-- re-attempt it first asks Twilio whether an identical message to that recipient was already created
-- since that time, and adopts it instead of sending again.
ALTER TABLE public.sms_dispatch_queue ADD COLUMN IF NOT EXISTS send_started_at TIMESTAMPTZ;

-- 3. Reconcile owned numbers with the SMS sender. Every SMS/WhatsApp sender, the STOP/status webhook
-- routing and the readiness check use workspaces.twilio_number; numbers bought or imported in-app only
-- ever landed in workspace_phone_numbers, so they were never used. A workspace with no sender number
-- adopts its most recent active SMS-capable number.
UPDATE public.workspaces w
SET twilio_number = n.phone_number
FROM (
    SELECT DISTINCT ON (workspace_id) workspace_id, phone_number
    FROM public.workspace_phone_numbers
    WHERE status = 'active' AND COALESCE((capabilities->>'sms')::boolean, false)
    ORDER BY workspace_id, created_at DESC
) n
WHERE w.id = n.workspace_id AND (w.twilio_number IS NULL OR w.twilio_number = '');
