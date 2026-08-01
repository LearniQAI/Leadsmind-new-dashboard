-- Fix: removeFormCollaborator() sets status = 'removed', but the real
-- CHECK constraint (20240101000161_update_collab_status.sql) only ever
-- allowed ('pending', 'active', 'declined', 'revoked', 'expired') --
-- 'removed' was never in it. Every call to remove a collaborator has
-- always failed with a check-constraint violation. The app's own UI
-- (FormsClient.tsx's FilterTab type, status badges) already treats
-- 'removed' as the canonical value throughout, so the fix is additive to
-- the constraint, not a change to application code.
ALTER TABLE public.form_collaborators DROP CONSTRAINT IF EXISTS form_collaborators_status_check;
ALTER TABLE public.form_collaborators ADD CONSTRAINT form_collaborators_status_check
  CHECK (status IN ('pending', 'active', 'declined', 'revoked', 'expired', 'removed'));
