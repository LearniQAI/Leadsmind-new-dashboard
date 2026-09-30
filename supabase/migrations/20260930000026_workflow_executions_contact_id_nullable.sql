-- WorkflowEngine.runWorkflow previously returned silently (no DB row at all)
-- whenever a workflow had zero steps configured or no CRM contact could be
-- resolved from the submission, because workflow_executions.contact_id was
-- NOT NULL and there was nothing valid to insert. That made a misconfigured
-- or contact-less automation indistinguishable from "never triggered" in the
-- Execution Logs UI. Allow contact_id to be null so those runs can be logged
-- as a 'failed' execution with a real error_message instead of vanishing.
ALTER TABLE public.workflow_executions
  ALTER COLUMN contact_id DROP NOT NULL;
