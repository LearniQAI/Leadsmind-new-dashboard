-- Called from workflowTriggerFn's first step, separately from the 'running' status update, so
-- that if Inngest retries just this step (not the whole function), the attempt count still only
-- increments once per real invocation rather than being coupled to a specific update statement's
-- own retry behavior.
CREATE OR REPLACE FUNCTION increment_form_automation_job_attempts(p_job_id UUID)
RETURNS VOID
LANGUAGE sql
AS $$
    UPDATE form_automation_jobs SET attempts = attempts + 1 WHERE id = p_job_id;
$$;

REVOKE ALL ON FUNCTION increment_form_automation_job_attempts FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_form_automation_job_attempts TO service_role;
