-- Allow an immediate-dispatch worker to claim one campaign without racing or
-- stealing other campaigns' scheduled jobs. The existing row-level locks and
-- SKIP LOCKED remain the sole ownership mechanism for both cron and Inngest.
CREATE OR REPLACE FUNCTION acquire_campaign_jobs(
    worker_id TEXT,
    batch_size INT,
    target_campaign_id UUID
)
RETURNS SETOF campaign_dispatch_queue AS $$
DECLARE
    job_record campaign_dispatch_queue%rowtype;
BEGIN
    FOR job_record IN
        SELECT * FROM campaign_dispatch_queue
        WHERE status IN ('pending', 'deferred')
          AND scheduled_for <= NOW()
          AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '5 minutes')
          AND (target_campaign_id IS NULL OR campaign_id = target_campaign_id)
        ORDER BY scheduled_for ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE campaign_dispatch_queue
        SET status = 'processing', locked_at = NOW(), locked_by = worker_id, updated_at = NOW()
        WHERE id = job_record.id
        RETURNING * INTO job_record;
        RETURN NEXT job_record;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
