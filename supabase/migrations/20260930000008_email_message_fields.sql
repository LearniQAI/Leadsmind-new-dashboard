-- Email data model for connected mailboxes (Gmail, Conversations PRD Section A), as ADDITIONS to the
-- existing conversations/messages model — no parallel conversation system.
--
-- Grouping is unchanged: one platform='email' conversation per contact, like every other channel.
-- Gmail's thread id is stored per message (provider_thread_id) so replies can be threaded correctly
-- in the contact's own mail client without switching to one-conversation-per-thread.
--
-- 1. email_mailboxes: a connected mailbox's identity (its address), separate from the OAuth token row.
--    Messages link here, not to user_calendar_connections, because the token row's identity is not
--    stable: explicit Disconnect DELETES it (reconnecting creates a new id), and reconnecting with a
--    different Google account UPSERTS the same row with a new address, which would silently re-label
--    old mail as belonging to the new mailbox. A mailbox row is keyed by address, outlives
--    disconnects, and points at whichever live connection currently serves it (connection_id).
--    Sync cursors and sender identity/signature (later batches) belong to the mailbox too.

CREATE TABLE IF NOT EXISTS public.email_mailboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- Kept (nulled) if the user is deleted, so mail already synced keeps its provenance.
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider text NOT NULL CHECK (provider IN ('gmail')),
  email_address text NOT NULL CHECK (email_address = lower(btrim(email_address)) AND email_address LIKE '%_@_%'),
  -- The live OAuth connection serving this mailbox; NULL after Disconnect.
  connection_id uuid REFERENCES public.user_calendar_connections(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_mailboxes_owner_address_key
  ON public.email_mailboxes (workspace_id, user_id, provider, email_address);
-- A connection serves exactly one mailbox at a time.
CREATE UNIQUE INDEX IF NOT EXISTS email_mailboxes_connection_key
  ON public.email_mailboxes (connection_id) WHERE connection_id IS NOT NULL;
-- Target for the composite FK from messages (same-workspace enforcement).
CREATE UNIQUE INDEX IF NOT EXISTS email_mailboxes_id_workspace_key
  ON public.email_mailboxes (id, workspace_id);

ALTER TABLE public.email_mailboxes ENABLE ROW LEVEL SECURITY;
-- Members may see which mailboxes exist (no tokens live here); every write is server-side
-- (service role) from the OAuth callback / sync, so there are no write policies.
CREATE POLICY "email_mailboxes_member_select" ON public.email_mailboxes
  FOR SELECT TO authenticated USING (check_workspace_access(workspace_id));
CREATE POLICY "module_access" ON public.email_mailboxes AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (NOT COALESCE((workspace_id = ANY ((SELECT module_denied_workspaces('{communication,crm}'::text[]))::uuid[])), false));
REVOKE ALL ON public.email_mailboxes FROM anon;
REVOKE TRUNCATE ON public.email_mailboxes FROM authenticated;

-- 2. messages: email fields. All nullable, no defaults (metadata-only change; existing rows untouched).
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS html_body text,
  ADD COLUMN IF NOT EXISTS email_from_address text,
  ADD COLUMN IF NOT EXISTS email_from_name text,
  ADD COLUMN IF NOT EXISTS email_to jsonb,            -- [{ "address": "...", "name": "..." }]
  ADD COLUMN IF NOT EXISTS email_cc jsonb,            -- same shape
  ADD COLUMN IF NOT EXISTS rfc_message_id text,       -- Message-ID header, without <>
  ADD COLUMN IF NOT EXISTS in_reply_to text,          -- In-Reply-To header, without <>
  ADD COLUMN IF NOT EXISTS email_references text[],   -- References header, oldest first, without <>
  ADD COLUMN IF NOT EXISTS provider_thread_id text,   -- Gmail threadId (per mailbox)
  ADD COLUMN IF NOT EXISTS provider_message_id text,  -- Gmail message id (per mailbox)
  ADD COLUMN IF NOT EXISTS mailbox_id uuid;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_email_to_is_array;
ALTER TABLE public.messages ADD CONSTRAINT messages_email_to_is_array
  CHECK (email_to IS NULL OR jsonb_typeof(email_to) = 'array');
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_email_cc_is_array;
ALTER TABLE public.messages ADD CONSTRAINT messages_email_cc_is_array
  CHECK (email_cc IS NULL OR jsonb_typeof(email_cc) = 'array');
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_rfc_message_id_bare;
ALTER TABLE public.messages ADD CONSTRAINT messages_rfc_message_id_bare
  CHECK (rfc_message_id IS NULL OR (rfc_message_id <> '' AND rfc_message_id !~ '[<>[:space:]]'));

-- Composite FK: a message can only point at a mailbox of ITS OWN workspace. messages is writable by
-- any member under RLS, and later batches send replies through the linked mailbox — a plain FK would
-- let a member point a message at another tenant's mailbox by id. Deleting a mailbox nulls only
-- mailbox_id (PG15+ column list), never workspace_id.
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_mailbox_same_workspace_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_mailbox_same_workspace_fkey
  FOREIGN KEY (mailbox_id, workspace_id) REFERENCES public.email_mailboxes (id, workspace_id)
  ON DELETE SET NULL (mailbox_id);

-- 3. Duplicate detection for email: the SAME email (same Message-ID) lands once per conversation,
--    however many connected mailboxes (teammates CC'd, sender + recipient both connected) or inbound
--    paths deliver it. Different emails have different Message-IDs, so they never collide. Scoped to
--    the conversation, not the database: one email to two contacts belongs in both their threads.
CREATE UNIQUE INDEX IF NOT EXISTS messages_conversation_rfc_message_id_key
  ON public.messages (conversation_id, rfc_message_id) WHERE rfc_message_id IS NOT NULL;
-- Re-syncing one mailbox never double-imports (Gmail ids are only unique within a mailbox), and the
-- fallback for the rare email with no Message-ID header.
CREATE UNIQUE INDEX IF NOT EXISTS messages_mailbox_provider_message_id_key
  ON public.messages (mailbox_id, provider_message_id) WHERE mailbox_id IS NOT NULL AND provider_message_id IS NOT NULL;
-- Reply threading: find the mailbox's latest message in a Gmail thread.
CREATE INDEX IF NOT EXISTS idx_messages_mailbox_thread
  ON public.messages (mailbox_id, provider_thread_id) WHERE provider_thread_id IS NOT NULL;

-- 4. external_id: unique per WORKSPACE instead of across the whole database. Meta/Twilio inbound
--    dedup (select-by-external_id then insert) still has its race backstop within a workspace; two
--    tenants can no longer block each other's inserts. The non-unique idx_messages_external_id stays
--    for the existing lookups.
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_external_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS messages_workspace_external_id_key
  ON public.messages (workspace_id, external_id) WHERE external_id IS NOT NULL;

-- 5. Attachments (none existed anywhere). Metadata here; bytes in the private message-attachments
--    bucket. Gmail attachments can be recorded before download (provider_attachment_id only) and
--    fetched lazily. Service-role writes only; members read metadata, files via signed URLs.
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  filename text NOT NULL,
  content_type text,
  size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes >= 0),
  storage_path text,              -- object path in the message-attachments bucket; NULL until downloaded
  provider_attachment_id text,    -- Gmail attachmentId
  content_id text,                -- Content-ID for inline (cid:) images, without <>
  is_inline boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_attachments_has_source CHECK (storage_path IS NOT NULL OR provider_attachment_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments (message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_workspace_id ON public.message_attachments (workspace_id);

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "message_attachments_member_select" ON public.message_attachments
  FOR SELECT TO authenticated USING (check_workspace_access(workspace_id));
CREATE POLICY "module_access" ON public.message_attachments AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (NOT COALESCE((workspace_id = ANY ((SELECT module_denied_workspaces('{communication,crm}'::text[]))::uuid[])), false));
REVOKE ALL ON public.message_attachments FROM anon;
REVOKE TRUNCATE ON public.message_attachments FROM authenticated;

-- Private bucket, no storage policies: only the service role writes/reads; downloads go through a
-- server route that authorises the caller and issues a short-lived signed URL (lms-student-files pattern).
-- 25 MB matches Gmail's per-message attachment limit.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('message-attachments', 'message-attachments', false, 26214400)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit;
