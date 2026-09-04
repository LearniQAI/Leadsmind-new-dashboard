-- Message Delivery Reliability — Part 2: automatic retry queue for the interactive
-- outbound send path (Instagram / Messenger / WhatsApp DMs from the inbox).
--
-- Design (see docs/message-delivery-reliability-audit.md + Part 2 build notes):
--  * Attempt 1 is INLINE inside sendMessage() with a 10s AbortController timeout —
--    the agent is watching, so the first try is synchronous.
--  * On a *recoverable* failure/timeout the message goes to status 'retrying' and a
--    row is enqueued here. A dedicated cron worker
--    (/api/cron/workers/message-dispatch) drains it with the same atomic
--    FOR UPDATE SKIP LOCKED pattern as whatsapp_dispatch_queue / sms_dispatch_queue.
--  * On a *non-recoverable* failure (bad/expired token, recipient blocked, policy
--    rejection) the message goes straight to 'failed' + a webhook_dead_letters row,
--    with NO retries burned.
--  * PRD's 5s/15s/45s backoff is below Vercel Cron's 1-minute floor, so it can't be
--    honoured literally without a separate always-on consumer. The adjusted,
--    env-tunable schedule lives in src/lib/messaging/retryConfig.ts
--    (MESSAGE_SEND_RETRY_BACKOFF_SECONDS, default "60,300,900";
--     MESSAGE_SEND_MAX_ATTEMPTS, default 4 = 1 inline + 3 retries).
--
-- One live retry track per message (UNIQUE message_id). Admin-client-only, same as
-- the sibling dispatch queues — no user-facing RLS policy.

CREATE TABLE IF NOT EXISTS public.message_dispatch_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,                       -- denormalised: worker avoids a join
    status TEXT NOT NULL DEFAULT 'pending',       -- pending | processing | done | failed
    attempt_count INTEGER NOT NULL DEFAULT 1,     -- attempts already made (inline attempt = 1)
    max_attempts INTEGER NOT NULL DEFAULT 4,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    last_error TEXT,
    last_error_code INTEGER,
    failure_class TEXT,                           -- 'recoverable' | 'permanent'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (message_id)
);

CREATE INDEX IF NOT EXISTS idx_message_dispatch_queue_worker
    ON public.message_dispatch_queue (status, next_attempt_at)
    WHERE status = 'pending';

DROP TRIGGER IF EXISTS update_message_dispatch_queue_updated_at ON public.message_dispatch_queue;
CREATE TRIGGER update_message_dispatch_queue_updated_at BEFORE UPDATE ON public.message_dispatch_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.message_dispatch_queue ENABLE ROW LEVEL SECURITY;
-- No user-facing policy: written only via the admin client from the server action
-- and the cron worker, identical to whatsapp_dispatch_queue / sms_dispatch_queue.

-- Atomic worker locking — identical shape to acquire_whatsapp_jobs / acquire_sms_jobs,
-- keyed on next_attempt_at instead of scheduled_for.
CREATE OR REPLACE FUNCTION acquire_message_jobs(worker_id TEXT, batch_size INT)
RETURNS SETOF public.message_dispatch_queue AS $$
DECLARE
    job_record public.message_dispatch_queue%rowtype;
BEGIN
    FOR job_record IN
        SELECT * FROM public.message_dispatch_queue
        WHERE status = 'pending'
          AND next_attempt_at <= NOW()
          AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '5 minutes')
        ORDER BY next_attempt_at ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE public.message_dispatch_queue
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
