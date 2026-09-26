-- Gmail inbound sync (Conversations batch 5): ongoing sync state on the mailbox + resumable import jobs.

-- 1. Ongoing sync state. history_id is Gmail's cursor (uint64 -> text). A short lease
--    (sync_locked_until) keeps the push webhook and the cron worker from syncing one mailbox at once;
--    sync_requested_at marks "a push arrived, sync soon" for whoever holds / next takes the lease.
ALTER TABLE public.email_mailboxes
  ADD COLUMN IF NOT EXISTS history_id text,
  ADD COLUMN IF NOT EXISTS watch_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS sync_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS sync_locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_error text;

ALTER TABLE public.email_mailboxes DROP CONSTRAINT IF EXISTS email_mailboxes_history_id_numeric;
ALTER TABLE public.email_mailboxes ADD CONSTRAINT email_mailboxes_history_id_numeric
  CHECK (history_id IS NULL OR history_id ~ '^[0-9]+$');

-- Push notifications arrive keyed by mailbox address.
CREATE INDEX IF NOT EXISTS idx_email_mailboxes_address_live
  ON public.email_mailboxes (email_address) WHERE connection_id IS NOT NULL;

-- 2. "Import existing conversations": an explicit, user-started, resumable background job.
--    The cron worker processes one page at a time under a lease and commits page_token together with
--    the counters, so an interrupted run resumes at the last committed page. Re-processing part of a
--    page cannot double-import (messages_mailbox_provider_message_id_key).
CREATE TABLE IF NOT EXISTS public.email_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  mailbox_id uuid NOT NULL REFERENCES public.email_mailboxes(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'counting'
    CHECK (status IN ('counting', 'importing', 'completed', 'failed', 'cancelled')),
  since timestamptz,                 -- NULL = all mail
  query text NOT NULL,               -- the Gmail search the job pages through
  page_token text,                   -- resume cursor for the current phase
  total_messages integer,            -- exact, from the counting phase
  processed integer NOT NULL DEFAULT 0,
  imported integer NOT NULL DEFAULT 0,
  duplicates integer NOT NULL DEFAULT 0,   -- already in LeadsMind via another path (Resend, a teammate)
  skipped integer NOT NULL DEFAULT 0,      -- filtered (no contact + never corresponded, internal, categories)
  errors integer NOT NULL DEFAULT 0,
  last_error text,
  locked_until timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One active import per mailbox.
CREATE UNIQUE INDEX IF NOT EXISTS email_import_jobs_one_active_per_mailbox
  ON public.email_import_jobs (mailbox_id) WHERE status IN ('counting', 'importing');
CREATE INDEX IF NOT EXISTS idx_email_import_jobs_workspace ON public.email_import_jobs (workspace_id);

-- Server-only: progress is read through /api/gmail/import (the caller's own mailbox only).
ALTER TABLE public.email_import_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_import_jobs FROM anon, authenticated;
