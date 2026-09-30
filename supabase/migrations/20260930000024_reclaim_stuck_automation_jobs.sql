-- Claim function for the stuck-job reconciler cron (src/app/api/cron/workers/
-- automation-jobs-reconciler/route.ts). Same FOR UPDATE SKIP LOCKED claim pattern as
-- acquire_workflow_executions (20260921000008_workflow_execution_claims.sql) — atomically claims
-- and increments attempts in one statement, so a job that flips to 'running'/'succeeded' between
-- the reconciler's read and this claim is simply not returned (0 rows affected for it), instead
-- of being re-dispatched a second time on top of a run that was just slow, not actually stuck.
CREATE OR REPLACE FUNCTION reclaim_stuck_automation_jobs(p_stale_before TIMESTAMPTZ, p_batch_size INT)
RETURNS SETOF form_automation_jobs
LANGUAGE sql
AS $$
    UPDATE form_automation_jobs
    SET attempts = attempts + 1
    WHERE id IN (
        SELECT id FROM form_automation_jobs
        WHERE status = 'queued' AND created_at < p_stale_before AND attempts < max_attempts
        ORDER BY created_at
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
$$;

REVOKE ALL ON FUNCTION reclaim_stuck_automation_jobs FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reclaim_stuck_automation_jobs TO service_role;
