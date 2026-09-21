-- B7: the dispatch-queue lock functions documented "recover dead locks after
-- 5 minutes" (locked_at < NOW() - 5 min) but only ever selected status IN
-- ('pending','deferred'/'pending'). A worker that claims a row (-> 'processing')
-- and then crashes / times out leaves it 'processing' forever: the recovery
-- clause could never match, because a stuck row is never pending.
--
-- Now a 'processing' row whose lock is older than 5 minutes is reclaimed.
-- Redelivery is bounded: each reclaim bumps retry_count, and a stale row that
-- has already been reclaimed 3 times is marked failed instead of retried again.
-- (A crash AFTER a provider accepted the message but before the status write is
-- indistinguishable from a crash before it, so a reclaim is at-least-once — the
-- bound limits, but cannot eliminate, that duplicate-send window.)

-- ── Email ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION acquire_campaign_jobs(
    worker_id TEXT,
    batch_size INT,
    target_campaign_id UUID
)
RETURNS SETOF campaign_dispatch_queue AS $$
DECLARE
    job_record campaign_dispatch_queue%rowtype;
BEGIN
    UPDATE campaign_dispatch_queue
    SET status = 'failed',
        error_log = 'Abandoned: worker did not finish this job after repeated attempts',
        locked_by = NULL, updated_at = NOW()
    WHERE status = 'processing'
      AND locked_at < NOW() - INTERVAL '5 minutes'
      AND retry_count >= 3
      AND (target_campaign_id IS NULL OR campaign_id = target_campaign_id);

    FOR job_record IN
        SELECT * FROM campaign_dispatch_queue
        WHERE (
                (status IN ('pending', 'deferred')
                  AND scheduled_for <= NOW()
                  AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '5 minutes'))
             OR (status = 'processing' AND locked_at < NOW() - INTERVAL '5 minutes')
              )
          AND (target_campaign_id IS NULL OR campaign_id = target_campaign_id)
        ORDER BY scheduled_for ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE campaign_dispatch_queue
        SET retry_count = CASE WHEN job_record.status = 'processing' THEN retry_count + 1 ELSE retry_count END,
            status = 'processing', locked_at = NOW(), locked_by = worker_id, updated_at = NOW()
        WHERE id = job_record.id
        RETURNING * INTO job_record;
        RETURN NEXT job_record;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Legacy 2-arg overload: delegate so both stay identical.
CREATE OR REPLACE FUNCTION acquire_campaign_jobs(worker_id TEXT, batch_size INT)
RETURNS SETOF campaign_dispatch_queue AS $$
    SELECT * FROM acquire_campaign_jobs(worker_id, batch_size, NULL::uuid);
$$ LANGUAGE sql;

-- ── SMS ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION acquire_sms_jobs(worker_id TEXT, batch_size INT)
RETURNS SETOF sms_dispatch_queue AS $$
DECLARE
    job_record sms_dispatch_queue%rowtype;
BEGIN
    UPDATE sms_dispatch_queue
    SET status = 'failed',
        error_log = 'Abandoned: worker did not finish this job after repeated attempts',
        locked_by = NULL, updated_at = NOW()
    WHERE status = 'processing'
      AND locked_at < NOW() - INTERVAL '5 minutes'
      AND retry_count >= 3;

    FOR job_record IN
        SELECT * FROM sms_dispatch_queue
        WHERE (
                (status = 'pending'
                  AND scheduled_for <= NOW()
                  AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '5 minutes'))
             OR (status = 'processing' AND locked_at < NOW() - INTERVAL '5 minutes')
              )
        ORDER BY scheduled_for ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE sms_dispatch_queue
        SET retry_count = CASE WHEN job_record.status = 'processing' THEN retry_count + 1 ELSE retry_count END,
            status = 'processing', locked_at = NOW(), locked_by = worker_id, updated_at = NOW()
        WHERE id = job_record.id
        RETURNING * INTO job_record;
        RETURN NEXT job_record;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ── WhatsApp ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION acquire_whatsapp_jobs(worker_id TEXT, batch_size INT)
RETURNS SETOF whatsapp_dispatch_queue AS $$
DECLARE
    job_record whatsapp_dispatch_queue%rowtype;
BEGIN
    UPDATE whatsapp_dispatch_queue
    SET status = 'failed',
        error_log = 'Abandoned: worker did not finish this job after repeated attempts',
        locked_by = NULL, updated_at = NOW()
    WHERE status = 'processing'
      AND locked_at < NOW() - INTERVAL '5 minutes'
      AND retry_count >= 3;

    FOR job_record IN
        SELECT * FROM whatsapp_dispatch_queue
        WHERE (
                (status = 'pending'
                  AND scheduled_for <= NOW()
                  AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '5 minutes'))
             OR (status = 'processing' AND locked_at < NOW() - INTERVAL '5 minutes')
              )
        ORDER BY scheduled_for ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE whatsapp_dispatch_queue
        SET retry_count = CASE WHEN job_record.status = 'processing' THEN retry_count + 1 ELSE retry_count END,
            status = 'processing', locked_at = NOW(), locked_by = worker_id, updated_at = NOW()
        WHERE id = job_record.id
        RETURNING * INTO job_record;
        RETURN NEXT job_record;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- These now contain a write branch; restrict like the email variants already are
-- (only the service-role cron workers call them).
REVOKE ALL ON FUNCTION public.acquire_sms_jobs(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_sms_jobs(text, integer) TO service_role;
REVOKE ALL ON FUNCTION public.acquire_whatsapp_jobs(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_whatsapp_jobs(text, integer) TO service_role;
