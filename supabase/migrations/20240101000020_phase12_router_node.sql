-- PHASE 12: MULTI-BRANCH ROUTER NODE
-- Adds a metadata JSONB column to workflow_step_logs so the chosen branch
-- name can be stored cleanly alongside the step result.
-- No changes to workflow_steps or workflow_executions are needed:
-- the route node's branches are stored entirely inside config JSONB.

ALTER TABLE public.workflow_step_logs
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN public.workflow_step_logs.metadata
  IS 'Stores extra context per step type. For route steps: { chosen_branch, evaluated_branches }';
