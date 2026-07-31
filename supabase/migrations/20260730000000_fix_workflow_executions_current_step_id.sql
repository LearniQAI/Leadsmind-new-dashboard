-- Fix: workflow_executions.current_step_id was referenced by
-- enroll_contact_in_workflow() (phase13/phase15) and executor.ts since
-- phase13, but no migration ever actually created the column — a pure
-- authoring gap, not a rename or an unapplied migration (confirmed via
-- `supabase migration list`: every migration up to and including phase13/15
-- is already applied remotely). This left the enrollment RPC failing with
-- `column "current_step_id" of relation "workflow_executions" does not
-- exist` for every workflow, every trigger, always.
--
-- `current_step` (INTEGER) is a separate, live, actively-used column
-- belonging to Engine B (src/lib/automations/AutomationLogger.ts) and is
-- intentionally left untouched here — this is additive only.
--
-- Type/semantics: executor.ts assigns current_step_id from
-- workflow_edges.target_step_id (a workflow_steps.id UUID), so this must
-- be a nullable UUID referencing workflow_steps(id), not the INTEGER
-- current_step already present.
ALTER TABLE public.workflow_executions
  ADD COLUMN IF NOT EXISTS current_step_id UUID NULL REFERENCES public.workflow_steps(id);
