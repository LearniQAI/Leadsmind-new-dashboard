-- The 20260730000000 migration added workflow_executions.current_step_id as
-- a plain FK reference to workflow_steps(id) with no ON DELETE action,
-- which defaults to RESTRICT/NO ACTION. Confirmed live during the Task 19
-- workflow-editor build: once a workflow has produced even one real
-- execution, that execution's current_step_id reference permanently blocks
-- deleting (and therefore replacing/re-saving) any of that workflow's
-- steps -- a real "delete or replace steps" save flow is impossible under
-- the original constraint, not a hypothetical edge case.
--
-- current_step_id is a live progress pointer, not an audit trail -- once a
-- step is deleted (e.g. the workflow is being edited/re-saved),
-- nulling out a stale reference to it is correct; the execution's own
-- workflow_step_logs rows (which DO need to survive as history) are
-- unaffected by this change.
ALTER TABLE public.workflow_executions
  DROP CONSTRAINT IF EXISTS workflow_executions_current_step_id_fkey;

ALTER TABLE public.workflow_executions
  ADD CONSTRAINT workflow_executions_current_step_id_fkey
  FOREIGN KEY (current_step_id) REFERENCES public.workflow_steps(id) ON DELETE SET NULL;
