-- Restructures public form submission for launch: a durable client-generated idempotency key
-- (double-click/retry can no longer create two leads), an atomic submission+job insert (a crash
-- between the two can no longer leave a submission with no automation job), and a visible job
-- queue row so automation status is readable in-app instead of only in Inngest's own dashboard.

-- ── 1. Idempotency key on form_submissions ──────────────────────────────────────────────────
-- Plain UNIQUE (not a partial index): Postgres treats NULLs as distinct under a plain UNIQUE
-- constraint (so rows with no key never collide), and supabase-js's upsert(onConflict:...) must
-- target a real constraint/index it can name — a partial index isn't addressable that way.
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS client_submission_id UUID;
ALTER TABLE form_submissions
    ADD CONSTRAINT form_submissions_form_client_submission_unique
    UNIQUE (form_id, client_submission_id);

-- ── 2. Visible job queue row per submission ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS form_automation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_submission_id UUID NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'workflow_trigger',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,
    -- Best-effort convenience link to the workflow_executions row for a "jump to the run"
    -- link — set only when exactly one workflow matched. Full per-workflow detail always lives
    -- in workflow_executions/workflow_step_logs regardless of whether this is set.
    workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_form_automation_jobs_submission ON form_automation_jobs (form_submission_id);
CREATE INDEX IF NOT EXISTS idx_form_automation_jobs_workspace_status ON form_automation_jobs (workspace_id, status);
-- Used by the stuck-job reconciler cron: find queued jobs older than its staleness window.
CREATE INDEX IF NOT EXISTS idx_form_automation_jobs_queued_created ON form_automation_jobs (created_at) WHERE status = 'queued';

ALTER TABLE form_automation_jobs ENABLE ROW LEVEL SECURITY;

-- Same pattern as workflow_executions/workflow_step_logs (20260715000000_harden_crm_automation_security.sql):
-- the app's automation engines only ever touch this table via the service-role admin client, so
-- this policy exists purely so a workspace member can read their own workspace's job rows (e.g.
-- the submissions page) without ever exposing another workspace's.
CREATE POLICY "Workspace access for automation jobs" ON form_automation_jobs
    FOR ALL
    USING (check_workspace_access(workspace_id))
    WITH CHECK (check_workspace_access(workspace_id));

-- ── 3. Link workflow_executions back to the submission that triggered it ───────────────────
ALTER TABLE workflow_executions
    ADD COLUMN IF NOT EXISTS form_submission_id UUID REFERENCES form_submissions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_executions_form_submission ON workflow_executions (form_submission_id);

-- ── 4. Atomic submission + job insert ───────────────────────────────────────────────────────
-- Scope note: this function does NOT perform the contact upsert/merge — that logic (token
-- verification, email/phone match precedence, "only overwrite an empty field" merge rules) stays
-- exactly as it is today in the route handler, already individually idempotent via its own
-- upsert(onConflict:'workspace_id,email'). What actually needed to be atomic for this task's goal
-- ("exactly one lead and one automation run") is narrower: the submission row and its job row
-- must never be split by a crash/race, and the (form_id, client_submission_id) uniqueness must be
-- enforced under real concurrency, not just checked-then-inserted from the application. A single
-- SQL function call is one implicit Postgres transaction, so both inserts here either both commit
-- or neither does.
CREATE OR REPLACE FUNCTION create_form_submission_with_job(
    p_form_id UUID,
    p_workspace_id UUID,
    p_client_submission_id UUID,
    p_contact_id UUID,
    p_data JSONB,
    p_source_url TEXT,
    p_source_type TEXT,
    p_user_agent TEXT,
    p_steps_completed INTEGER,
    p_attribution JSONB,
    p_is_returning BOOLEAN,
    p_attachments JSONB,
    p_transaction_id TEXT,
    p_transaction_status TEXT,
    p_contact_sync_error TEXT,
    p_variant_id UUID,
    p_job_type TEXT,
    p_job_payload JSONB
)
RETURNS TABLE (submission_id UUID, is_duplicate BOOLEAN, job_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_submission_id UUID;
    v_job_id UUID;
BEGIN
    IF p_client_submission_id IS NOT NULL THEN
        INSERT INTO form_submissions (
            workspace_id, form_id, contact_id, data, source_url, source_type, user_agent,
            steps_completed, attribution, is_returning, attachments, transaction_id,
            transaction_status, contact_sync_error, variant_id, client_submission_id
        ) VALUES (
            p_workspace_id, p_form_id, p_contact_id, p_data, p_source_url, p_source_type, p_user_agent,
            p_steps_completed, p_attribution, p_is_returning, p_attachments, p_transaction_id,
            p_transaction_status, p_contact_sync_error, p_variant_id, p_client_submission_id
        )
        ON CONFLICT (form_id, client_submission_id) DO NOTHING
        RETURNING id INTO v_submission_id;

        IF v_submission_id IS NULL THEN
            -- A concurrent request (double-click/retry) with the SAME key already won the
            -- insert. This is a genuine duplicate, not a fresh submission: return the winner's
            -- row and no job id, so the caller skips tag assignment / webhook / automation
            -- dispatch entirely rather than firing them a second time.
            SELECT id INTO v_submission_id FROM form_submissions
                WHERE form_id = p_form_id AND client_submission_id = p_client_submission_id;
            RETURN QUERY SELECT v_submission_id, true, NULL::UUID;
            RETURN;
        END IF;
    ELSE
        INSERT INTO form_submissions (
            workspace_id, form_id, contact_id, data, source_url, source_type, user_agent,
            steps_completed, attribution, is_returning, attachments, transaction_id,
            transaction_status, contact_sync_error, variant_id
        ) VALUES (
            p_workspace_id, p_form_id, p_contact_id, p_data, p_source_url, p_source_type, p_user_agent,
            p_steps_completed, p_attribution, p_is_returning, p_attachments, p_transaction_id,
            p_transaction_status, p_contact_sync_error, p_variant_id
        )
        RETURNING id INTO v_submission_id;
    END IF;

    INSERT INTO form_automation_jobs (form_submission_id, workspace_id, type, payload, status)
    VALUES (v_submission_id, p_workspace_id, p_job_type, p_job_payload, 'queued')
    RETURNING id INTO v_job_id;

    RETURN QUERY SELECT v_submission_id, false, v_job_id;
END;
$$;

-- Only ever called from the public-submit route's service-role admin client (same as every other
-- write on this path) — never from a browser session. Matches the revoke-then-explicitly-grant
-- convention from the SECURITY DEFINER hardening sweep (20260921000002).
REVOKE ALL ON FUNCTION create_form_submission_with_job FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_form_submission_with_job TO service_role;
