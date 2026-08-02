-- Fix: form_collaborators.workspace_id was referenced by every write path in
-- src/app/actions/collaborators.ts (acceptFormInvitation, declineFormInvitation,
-- removeFormCollaborator, updateFormCollaboratorRole, and 2 more — 6 call sites
-- total, all `.eq("workspace_id", workspaceId)`), but no migration ever
-- actually created the column. Same authoring-gap shape as the earlier
-- workflow_executions.current_step_id and contacts.company fixes: confirmed
-- live that every one of those queries silently matches zero rows today
-- (PostgREST error querying a nonexistent column), so the entire
-- accept/decline/remove/role-update flow is broken for every real invite.
--
-- Query logic in collaborators.ts is untouched — it was already correct,
-- just filtering on a column that didn't exist.
ALTER TABLE public.form_collaborators
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);

-- Backfill existing rows from the parent form's workspace_id.
UPDATE public.form_collaborators fc
SET workspace_id = f.workspace_id
FROM public.forms f
WHERE fc.form_id = f.id
  AND fc.workspace_id IS NULL;
