-- Separate from status/last_error (which represent the workflow-automation run, not the
-- webhook): the public form-submit route's webhook enqueue can independently time out on its own
-- 3s race without the automation dispatch being affected at all, so it needs its own flag rather
-- than overloading a job row column that already means something specific.
ALTER TABLE form_automation_jobs
    ADD COLUMN IF NOT EXISTS webhook_enqueue_timed_out BOOLEAN NOT NULL DEFAULT false;
