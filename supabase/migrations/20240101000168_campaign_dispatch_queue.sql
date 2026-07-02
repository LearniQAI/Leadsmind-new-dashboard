-- Campaign Dispatch Queue
CREATE TABLE IF NOT EXISTS campaign_dispatch_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, sent, failed, deferred
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    error_log TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for queue workers to find jobs quickly (pending or deferred and scheduled in the past)
CREATE INDEX IF NOT EXISTS idx_campaign_queue_worker ON campaign_dispatch_queue(status, scheduled_for)
WHERE status IN ('pending', 'deferred');

-- Index to query status per campaign
CREATE INDEX IF NOT EXISTS idx_campaign_queue_campaign ON campaign_dispatch_queue(campaign_id, status);

ALTER TABLE campaign_dispatch_queue ENABLE ROW LEVEL SECURITY;

-- RPC for atomic queue worker locking using FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION acquire_campaign_jobs(worker_id TEXT, batch_size INT)
RETURNS SETOF campaign_dispatch_queue AS $$
DECLARE
    job_record campaign_dispatch_queue%rowtype;
BEGIN
    FOR job_record IN
        SELECT * FROM campaign_dispatch_queue
        WHERE status IN ('pending', 'deferred') 
          AND scheduled_for <= NOW()
          AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '5 minutes') -- recover dead locks
        ORDER BY scheduled_for ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE campaign_dispatch_queue
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
