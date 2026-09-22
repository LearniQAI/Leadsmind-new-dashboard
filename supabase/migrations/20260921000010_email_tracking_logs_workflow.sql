-- Email Sequences S5: sequence/automation emails now carry a workflow_id tag, and the
-- deliverability webhook records their opens/clicks. email_tracking_logs was campaign-only
-- (campaign_id NOT NULL), so a workflow-originated event had nowhere to go. Now a row belongs
-- to a campaign OR a workflow.
ALTER TABLE public.email_tracking_logs
    ALTER COLUMN campaign_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS workflow_id uuid REFERENCES public.workflows(id) ON DELETE CASCADE;

ALTER TABLE public.email_tracking_logs
    DROP CONSTRAINT IF EXISTS email_tracking_logs_source_check;
ALTER TABLE public.email_tracking_logs
    ADD CONSTRAINT email_tracking_logs_source_check
    CHECK (campaign_id IS NOT NULL OR workflow_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_email_tracking_logs_workflow
    ON public.email_tracking_logs (workflow_id) WHERE workflow_id IS NOT NULL;
