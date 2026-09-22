-- SMS delivery receipts. The dispatch worker only knew that Twilio ACCEPTED a message ("sent");
-- delivered / undelivered / failed were invisible because no status callback existed.
-- Twilio now calls /api/webhooks/twilio/sms-status for every status change of a bulk-SMS message.

ALTER TABLE public.sms_dispatch_queue
    ADD COLUMN IF NOT EXISTS delivery_status TEXT,
    ADD COLUMN IF NOT EXISTS delivery_error_code TEXT,
    ADD COLUMN IF NOT EXISTS delivery_updated_at TIMESTAMPTZ;

ALTER TABLE public.bulk_sms_campaigns
    ADD COLUMN IF NOT EXISTS total_delivered INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_undelivered INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sms_queue_twilio_sid ON public.sms_dispatch_queue (twilio_sid) WHERE twilio_sid IS NOT NULL;

-- Applies one Twilio status callback to the queue row that carries that MessageSid, atomically:
--  * Twilio can deliver callbacks out of order and more than once, so a status only moves a row
--    FORWARD (queued < sent < delivered/undelivered/failed) and a terminal status is final;
--  * the campaign's delivered / undelivered counter is bumped in the same transaction, exactly once
--    per message, however many callbacks arrive or how they interleave (the row is locked FOR UPDATE);
--  * scoped by workspace, so one workspace's callback can never touch another's row.
-- SECURITY INVOKER, service-role only (called by the signed webhook).
CREATE OR REPLACE FUNCTION public.apply_sms_delivery_status(
    p_workspace_id uuid,
    p_message_sid text,
    p_status text,
    p_error_code text
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    q public.sms_dispatch_queue%rowtype;
    v_status text := lower(coalesce(p_status, ''));
    v_new_rank int;
    v_old_rank int;
    v_failed boolean;
BEGIN
    v_new_rank := CASE v_status
        WHEN 'accepted' THEN 1 WHEN 'scheduled' THEN 1 WHEN 'queued' THEN 1 WHEN 'sending' THEN 1
        WHEN 'sent' THEN 2
        WHEN 'delivered' THEN 3 WHEN 'read' THEN 3 WHEN 'undelivered' THEN 3 WHEN 'failed' THEN 3
        ELSE NULL END;
    IF v_new_rank IS NULL THEN
        RETURN jsonb_build_object('applied', false, 'reason', 'unknown_status');
    END IF;

    SELECT * INTO q FROM public.sms_dispatch_queue
    WHERE workspace_id = p_workspace_id AND twilio_sid = p_message_sid
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('applied', false, 'reason', 'not_found');
    END IF;

    v_old_rank := CASE lower(coalesce(q.delivery_status, ''))
        WHEN '' THEN 0
        WHEN 'accepted' THEN 1 WHEN 'scheduled' THEN 1 WHEN 'queued' THEN 1 WHEN 'sending' THEN 1
        WHEN 'sent' THEN 2
        ELSE 3 END;
    IF v_new_rank <= v_old_rank THEN
        RETURN jsonb_build_object('applied', false, 'reason', 'stale_or_duplicate');
    END IF;

    v_failed := v_status IN ('undelivered', 'failed');
    UPDATE public.sms_dispatch_queue
    SET delivery_status = v_status,
        delivery_error_code = CASE WHEN v_failed THEN NULLIF(p_error_code, '') ELSE delivery_error_code END,
        delivery_updated_at = NOW(),
        error_log = CASE WHEN v_failed THEN 'Not delivered (Twilio ' || v_status || COALESCE(', error ' || NULLIF(p_error_code, ''), '') || ')' ELSE error_log END,
        updated_at = NOW()
    WHERE id = q.id;

    IF v_new_rank = 3 THEN
        UPDATE public.bulk_sms_campaigns
        SET total_delivered = total_delivered + CASE WHEN v_failed THEN 0 ELSE 1 END,
            total_undelivered = total_undelivered + CASE WHEN v_failed THEN 1 ELSE 0 END
        WHERE id = q.campaign_id;
    END IF;

    RETURN jsonb_build_object('applied', true, 'campaign_id', q.campaign_id, 'contact_id', q.contact_id,
                              'terminal', v_new_rank = 3, 'failed', v_failed);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_sms_delivery_status(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_sms_delivery_status(uuid, text, text, text) TO service_role;
