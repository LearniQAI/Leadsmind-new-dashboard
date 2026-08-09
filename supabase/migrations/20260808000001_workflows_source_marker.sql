-- Marks which UI created a workflow row (e.g. the simplified Email Sequences
-- builder vs. the generic Workflow Builder) so the sequences list can query
-- its own workflows without a parallel table -- both write the exact same
-- workflows/workflow_steps/workflow_edges rows via the same executor.
ALTER TABLE public.workflows
    ADD COLUMN IF NOT EXISTS source TEXT NULL;

COMMENT ON COLUMN public.workflows.source IS
    'Origin UI marker, e.g. ''email_sequence''. NULL for workflows created via the generic Workflow Builder.';
