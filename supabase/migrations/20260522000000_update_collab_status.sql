ALTER TABLE public.form_collaborators DROP CONSTRAINT IF EXISTS form_collaborators_status_check;
ALTER TABLE public.form_collaborators ADD CONSTRAINT form_collaborators_status_check CHECK (status IN ('pending', 'active', 'declined', 'revoked', 'expired'));
