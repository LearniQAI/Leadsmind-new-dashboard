-- Flag a phone number invalid on repeated permanent-shaped delivery failure, mirroring how email's
-- bounce handling flags contacts.is_invalid_email (soft_bounce_count / consecutive_soft_bounces,
-- threshold consecutive>=3 OR total>=5). Only 21610 ("recipient unsubscribed") currently acted on a
-- delivery receipt; every other Twilio failure code was recorded but never stopped future sends to a
-- number that will never receive one, so a workspace kept paying to retry a dead number forever.
--
-- Twilio's own error-dictionary wording hedges almost every one of these codes ("may no longer
-- exist", "usually... temporarily unreachable") -- none is unambiguous proof on a single occurrence,
-- so this uses the SAME repeated-occurrence threshold already established for email soft bounces
-- rather than flagging invalid on the first failure. Codes deliberately EXCLUDED from counting:
--   30001 account/sender queue overflow, 30002 account suspended -- SENDER-side, not about the
--     destination number at all;
--   30007 carrier/content filtering -- Twilio's own docs: message-specific, "a different message to
--     the same number could succeed"; counting it would risk flagging a perfectly good number.
-- Counted (destination-shaped, even though each is individually hedged as sometimes-transient):
--   30003 unreachable handset, 30004 blocked, 30005 unknown/nonexistent destination,
--   30006 landline or unreachable carrier.
-- 21610 stays on its OWN existing path (recordSmsOptOut): that is a consent signal (STOP), not a
-- deliverability one, and must never be conflated with "the number is dead" (a corrected/working
-- number should not stay opted out; an invalid number is not a consent withdrawal).

ALTER TABLE public.contacts
    ADD COLUMN IF NOT EXISTS sms_invalid BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS sms_invalid_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS sms_soft_fail_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sms_consecutive_soft_fails INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.bulk_sms_campaigns
    ADD COLUMN IF NOT EXISTS total_skipped_invalid_number INTEGER NOT NULL DEFAULT 0;

-- Durable, workspace + phone_e164 scoped -- the SAME shape and enforcement point as
-- sms_suppression_list's STOP rows (src/lib/smsOptOut.ts's getSmsOptOutReason already blocks sending
-- to ANY row in this table regardless of `reason`), because "this number cannot receive SMS" should
-- survive the contact being deleted and re-imported exactly like a STOP does -- a landline is still a
-- landline. Distinguished from a STOP by reason='invalid_number' (never the opt-out contact flags:
-- sms_opt_out/opted_out are a CONSENT signal, and this is not one).
--
-- Atomic: increments the counters and, crossing the threshold, flags invalid + writes the
-- suppression row, all under one lock -- two near-simultaneous failure callbacks for the same
-- contact (different campaigns) cannot both increment past the threshold without the flag landing.
-- SECURITY INVOKER, service-role only (called by the signed delivery-status webhook).
CREATE OR REPLACE FUNCTION public.record_sms_soft_fail(
    p_workspace_id uuid,
    p_contact_id uuid,
    p_phone_e164 text,
    p_error_code text,
    p_message_sid text
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total int;
    v_consecutive int;
    v_already_invalid boolean;
    v_flagged boolean := false;
BEGIN
    SELECT sms_soft_fail_count + 1, sms_consecutive_soft_fails + 1, sms_invalid
    INTO v_total, v_consecutive, v_already_invalid
    FROM public.contacts
    WHERE id = p_contact_id AND workspace_id = p_workspace_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('flagged', false, 'reason', 'contact_not_found');
    END IF;

    v_flagged := NOT v_already_invalid AND (v_consecutive >= 3 OR v_total >= 5);

    UPDATE public.contacts
    SET sms_soft_fail_count = v_total,
        sms_consecutive_soft_fails = v_consecutive,
        sms_invalid = sms_invalid OR v_flagged,
        sms_invalid_at = CASE WHEN v_flagged THEN NOW() ELSE sms_invalid_at END
    WHERE id = p_contact_id;

    IF v_flagged AND p_phone_e164 IS NOT NULL THEN
        INSERT INTO public.sms_suppression_list (workspace_id, phone_e164, reason, source, message_sid, suppressed_at)
        VALUES (p_workspace_id, p_phone_e164, 'invalid_number', 'twilio_error_' || p_error_code, p_message_sid, NOW())
        ON CONFLICT (workspace_id, phone_e164) DO NOTHING; -- a STOP or an earlier invalid-number row already covers it
    END IF;

    RETURN jsonb_build_object('flagged', v_flagged, 'total', v_total, 'consecutive', v_consecutive);
END;
$$;

-- A DELIVERED receipt resets the consecutive streak (matches email's isDeliverySuccess branch) --
-- a number that just received something is obviously not dead. The cumulative total is left alone
-- deliberately (mirrors email): it is a lifetime signal of a flaky number, not reset by one success.
CREATE OR REPLACE FUNCTION public.reset_sms_soft_fail_streak(p_contact_id uuid)
RETURNS void
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
    UPDATE public.contacts SET sms_consecutive_soft_fails = 0 WHERE id = p_contact_id AND sms_consecutive_soft_fails <> 0;
$$;

REVOKE ALL ON FUNCTION public.record_sms_soft_fail(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_sms_soft_fail(uuid, uuid, text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.reset_sms_soft_fail_streak(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_sms_soft_fail_streak(uuid) TO service_role;

-- refresh_sms_campaign_totals (20260921000014) also needs to count the new terminal status; a
-- 'skipped_invalid_number' row already falls outside the 'open' set (pending/processing/deferred),
-- so no other part of the function's contract changes.
CREATE OR REPLACE FUNCTION public.refresh_sms_campaign_totals(p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sent int; v_failed int; v_skipped int; v_invalid int; v_cancelled int; v_open int;
BEGIN
    PERFORM 1 FROM public.bulk_sms_campaigns WHERE id = p_campaign_id FOR UPDATE;
    IF NOT FOUND THEN RETURN NULL; END IF;

    SELECT count(*) FILTER (WHERE status = 'sent'),
           count(*) FILTER (WHERE status = 'failed'),
           count(*) FILTER (WHERE status = 'skipped_opt_out'),
           count(*) FILTER (WHERE status = 'skipped_invalid_number'),
           count(*) FILTER (WHERE status = 'cancelled'),
           count(*) FILTER (WHERE status IN ('pending', 'processing', 'deferred'))
    INTO v_sent, v_failed, v_skipped, v_invalid, v_cancelled, v_open
    FROM public.sms_dispatch_queue WHERE campaign_id = p_campaign_id;

    UPDATE public.bulk_sms_campaigns
    SET total_sent = v_sent, total_failed = v_failed, total_skipped_opt_out = v_skipped,
        total_skipped_invalid_number = v_invalid
    WHERE id = p_campaign_id;

    RETURN jsonb_build_object('sent', v_sent, 'failed', v_failed, 'skipped_opt_out', v_skipped,
                              'skipped_invalid_number', v_invalid, 'cancelled', v_cancelled, 'open', v_open);
END;
$$;
