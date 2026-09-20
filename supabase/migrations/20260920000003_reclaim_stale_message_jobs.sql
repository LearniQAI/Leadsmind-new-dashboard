-- Same stuck-'processing' fix as 20260920000001 (email/SMS/WhatsApp campaigns),
-- applied to the Communications Hub retry queue. acquire_message_jobs only ever
-- selected status = 'pending', so its "locked_at < NOW() - 5 minutes" recovery
-- clause could never match a row left 'processing' by a crashed/timed-out worker
-- (the worker's end-of-batch sweep covers a clean exit, not a hard kill).
--
-- A 'processing' row whose lock is older than 5 minutes is now reclaimed.
-- Redelivery is bounded by the queue's own attempt accounting: attempt_count is
-- attempts already made and the next one is attempt_count + 1, so a stale row
-- whose crashed attempt was the last allowed one (attempt_count >= max_attempts
-- - 1) has nothing left to retry. Each reclaim bumps attempt_count, counting the
-- crashed attempt as used. An exhausted row is marked failed AND its message and
-- a dead-letter entry are settled — otherwise the inbox would show the message
-- as 'retrying' forever, which is the same stranding one level up.
-- (A crash after the platform accepted the DM but before the status write is
-- indistinguishable from one before it, so a reclaim is at-least-once.)

CREATE OR REPLACE FUNCTION acquire_message_jobs(worker_id TEXT, batch_size INT)
RETURNS SETOF public.message_dispatch_queue AS $$
DECLARE
    job_record public.message_dispatch_queue%rowtype;
BEGIN
    WITH abandoned AS (
        UPDATE public.message_dispatch_queue
        SET status = 'failed',
            last_error = 'Abandoned: worker did not finish this job (crash/timeout) and no attempts remain',
            locked_by = NULL, updated_at = NOW()
        WHERE status = 'processing'
          AND locked_at < NOW() - INTERVAL '5 minutes'
          AND attempt_count >= max_attempts - 1
        RETURNING message_id, workspace_id, conversation_id, platform
    ), settled AS (
        UPDATE public.messages m
        SET status = 'failed',
            metadata = COALESCE(m.metadata, '{}'::jsonb)
                       || jsonb_build_object('error_message', 'Sending was interrupted and could not be completed. Please retry.')
        FROM abandoned a
        WHERE m.id = a.message_id
          AND m.status IN ('queued', 'sending', 'retrying')
        RETURNING m.id
    )
    INSERT INTO public.webhook_dead_letters (provider, payload, error, error_type, retry_state)
    SELECT 'message_send',
           jsonb_build_object('message_id', a.message_id, 'conversation_id', a.conversation_id,
                              'workspace_id', a.workspace_id, 'platform', a.platform),
           'Message send abandoned: worker crashed/timed out on the final allowed attempt',
           'message_send_abandoned_stale_lock',
           'unresolved'
    FROM abandoned a;

    FOR job_record IN
        SELECT * FROM public.message_dispatch_queue
        WHERE (
                (status = 'pending'
                  AND next_attempt_at <= NOW()
                  AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '5 minutes'))
             OR (status = 'processing' AND locked_at < NOW() - INTERVAL '5 minutes')
              )
        ORDER BY next_attempt_at ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE public.message_dispatch_queue
        SET attempt_count = CASE WHEN job_record.status = 'processing' THEN attempt_count + 1 ELSE attempt_count END,
            status = 'processing', locked_at = NOW(), locked_by = worker_id, updated_at = NOW()
        WHERE id = job_record.id
        RETURNING * INTO job_record;
        RETURN NEXT job_record;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- The worker's partial index covers only 'pending'; give the stale-lock scan its own.
CREATE INDEX IF NOT EXISTS idx_message_dispatch_queue_processing
    ON public.message_dispatch_queue (locked_at)
    WHERE status = 'processing';

-- Now has write branches on messages/dead letters: service-role (cron worker) only,
-- like the campaign acquire functions.
REVOKE ALL ON FUNCTION public.acquire_message_jobs(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_message_jobs(text, integer) TO service_role;
