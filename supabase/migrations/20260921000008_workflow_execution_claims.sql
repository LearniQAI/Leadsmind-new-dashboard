-- Email Sequences S4: workflow_executions is the fifth work queue (after email/SMS/
-- WhatsApp campaigns and Communications Hub messages) and had none of the safeguards:
--  * a run whose worker crashed/timed out mid-step stayed 'running' forever (the resume
--    cron only looked for resume_at/held_until, so nothing ever picked it up) and, with the
--    default max_concurrent=1, then blocked that contact from re-enrolling;
--  * two overlapping cron runs could both resume the same execution and send a step twice.
--
-- Same pattern as 20260920000001 / 20260920000003: locked_at + locked_by claimed under
-- FOR UPDATE SKIP LOCKED, a lock older than 5 minutes is reclaimed, every reclaim bumps a
-- counter, and a run that has already been reclaimed 3 times is marked failed instead of
-- retried again. (A crash after the provider accepted an email but before progress was
-- recorded is indistinguishable from one before it, so a reclaim is at-least-once; the
-- executor sends with a per-attempt idempotency key to close that window.)
--
-- next_attempt_at is the retry backoff for a step that failed transiently.

ALTER TABLE public.workflow_executions
    ADD COLUMN IF NOT EXISTS locked_at timestamptz,
    ADD COLUMN IF NOT EXISTS locked_by text,
    ADD COLUMN IF NOT EXISTS reclaim_count integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz;

-- Partial index for the scan below (only in-flight rows matter).
CREATE INDEX IF NOT EXISTS idx_workflow_executions_running_claim
    ON public.workflow_executions (started_at)
    WHERE status = 'running';

-- Claims executions and returns them already locked to worker_id.
--  * target_execution_id set: claim exactly that execution (used when a run is started or
--    resumed directly); the "is it due" gates are then the executor's business.
--  * target_execution_id NULL: the sweep -- every running execution that is unlocked (or
--    whose lock is stale) and whose wait / business-hours hold / retry backoff has elapsed.
--    This is what recovers a run stranded 'running' with none of those set.
CREATE OR REPLACE FUNCTION public.acquire_workflow_executions(
    worker_id text,
    batch_size integer,
    target_execution_id uuid DEFAULT NULL
)
RETURNS SETOF public.workflow_executions
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    rec public.workflow_executions%rowtype;
BEGIN
    -- Abandon runs already reclaimed 3 times whose lock is stale again.
    UPDATE public.workflow_executions
    SET status = 'failed',
        error_message = 'Abandoned: worker did not finish this run after repeated attempts',
        completed_at = NOW(), updated_at = NOW(),
        locked_by = NULL, locked_at = NULL
    WHERE status = 'running'
      AND locked_at < NOW() - INTERVAL '5 minutes'
      AND reclaim_count >= 3
      AND (target_execution_id IS NULL OR id = target_execution_id);

    FOR rec IN
        SELECT * FROM public.workflow_executions
        WHERE status = 'running'
          AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '5 minutes')
          AND (
                target_execution_id IS NOT NULL AND id = target_execution_id
             OR (
                target_execution_id IS NULL
                -- grace so a run that was just created is left to the caller that created it
                AND started_at < NOW() - INTERVAL '1 minute'
                AND COALESCE(NULLIF(context->>'resume_at', '')::timestamptz, '-infinity') <= NOW()
                AND COALESCE(NULLIF(context->>'held_until', '')::timestamptz, '-infinity') <= NOW()
                AND COALESCE(next_attempt_at, '-infinity') <= NOW()
             )
          )
        ORDER BY started_at ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE public.workflow_executions
        SET reclaim_count = CASE WHEN rec.locked_at IS NOT NULL THEN reclaim_count + 1 ELSE reclaim_count END,
            locked_at = NOW(), locked_by = worker_id, updated_at = NOW()
        WHERE id = rec.id
        RETURNING * INTO rec;
        RETURN NEXT rec;
    END LOOP;
END;
$$;

-- Service-role (cron worker / server-side executor) only. Not SECURITY DEFINER.
REVOKE ALL ON FUNCTION public.acquire_workflow_executions(text, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_workflow_executions(text, integer, uuid) TO service_role;
