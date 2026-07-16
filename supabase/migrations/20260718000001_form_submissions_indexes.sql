-- form_submissions grows unbounded from public form traffic and is queried
-- by form_id (dashboard submissions list) and by recency, but had no
-- indexes beyond the primary key. contacts(workspace_id, email) is already
-- covered by the existing UNIQUE(workspace_id, email) constraint, which
-- Postgres backs with its own index.
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON public.form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_at ON public.form_submissions(submitted_at);
