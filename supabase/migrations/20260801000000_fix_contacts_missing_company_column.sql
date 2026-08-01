-- Fix: contacts.company was referenced by three independent, unrelated call
-- sites — src/app/api/public/forms/[id]/submit/route.ts (new-contact insert
-- and existing-contact update), src/app/actions/portal.ts (portal profile
-- update), and src/app/api/public/forms/[id]/prefill/route.ts (prefill read)
-- — but no migration ever actually created the column. A pure authoring gap,
-- same shape as the earlier workflow_executions.current_step_id gap
-- (20260730000000_fix_workflow_executions_current_step_id.sql): confirmed
-- live that any new-contact creation through the public form-submission
-- endpoint's email/phone upsert path always fails with "Could not find the
-- 'company' column of 'contacts' in the schema cache", because the insert
-- payload unconditionally includes a `company` key (even when null).
--
-- Plain TEXT, matching every other free-text contact field (first_name,
-- last_name, phone) and the `company?: string` shape already assumed by
-- portal.ts's updatePayload.
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS company TEXT;
