-- Communications: real unread state + premium new-message notifications (all channels).
--
-- Audit findings this builds on (2026-09-26):
--   * New-message notifications already exist as ONE mechanism for every channel: the AFTER INSERT
--     trigger on_new_message_notification -> public.notifications, which the header bell streams via
--     Supabase Realtime. (WorkspaceNotificationCenter writes a different, unused-by-the-UI table.)
--     Because it fires per INSERTED ROW, it is already deduplicated at the same layer as messages:
--     a second copy of an email (Resend + Gmail, a teammate's mailbox, a re-sync) is rejected by the
--     unique indexes before the trigger runs, so it can never notify twice.
--   * It notified only role='admin', linked to /conversations (not the thread), carried no channel,
--     and would have fired for every message a Gmail history import pulls in.
--   * There was NO unread state anywhere (the UI's unread_count was never populated).
-- This migration extends those; it does not add a second notification system.

-- 1. Historical imports are real messages but never "new": no notification, never unread.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS historical_import boolean NOT NULL DEFAULT false;

-- 2. Structured context for the toast (channel icon, deep link) without parsing text.
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3. Per-user read state. Unread for a user = inbound, non-imported messages created after their
--    last_read_at for that conversation. Per conversation (not per contact), so it stays correct
--    under the one-email-conversation-per-contact index, and both email paths write the same rows.
CREATE TABLE IF NOT EXISTS public.conversation_reads (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_conversation_reads_user_workspace ON public.conversation_reads (user_id, workspace_id);

ALTER TABLE public.conversation_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversation_reads_own_select" ON public.conversation_reads
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "conversation_reads_own_insert" ON public.conversation_reads
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND check_workspace_access(workspace_id));
CREATE POLICY "conversation_reads_own_update" ON public.conversation_reads
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND check_workspace_access(workspace_id));
REVOKE ALL ON public.conversation_reads FROM anon;
REVOKE TRUNCATE ON public.conversation_reads FROM authenticated;

-- Other tabs / devices of the same user update their badge when one of them marks a thread read.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversation_reads') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_reads;
  END IF;
END $$;

-- 4. Unread counts for the CALLER (SECURITY INVOKER: messages/conversations RLS + the Communication
--    module gate apply). A conversation never opened counts from when the user joined the workspace,
--    and nothing before this feature shipped counts, so the badge doesn't open on a wall of history.
CREATE OR REPLACE FUNCTION public.conversation_unread_counts(p_workspace_id uuid)
RETURNS TABLE (conversation_id uuid, unread integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT m.conversation_id, count(*)::integer AS unread
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id AND c.workspace_id = p_workspace_id
  JOIN public.workspace_members wm ON wm.workspace_id = p_workspace_id AND wm.user_id = auth.uid()
  LEFT JOIN public.conversation_reads r ON r.conversation_id = m.conversation_id AND r.user_id = auth.uid()
  WHERE m.workspace_id = p_workspace_id
    AND m.direction = 'inbound'
    AND NOT m.historical_import
    AND m.created_at > COALESCE(r.last_read_at, GREATEST(COALESCE(wm.joined_at, '-infinity'::timestamptz), '2026-09-26 05:15:00+00'::timestamptz))
  GROUP BY m.conversation_id;
$$;
REVOKE ALL ON FUNCTION public.conversation_unread_counts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.conversation_unread_counts(uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_messages_inbound_unread
  ON public.messages (workspace_id, created_at)
  WHERE direction = 'inbound' AND NOT historical_import;

-- 5. The notification trigger, extended (same trigger, same table the bell already streams).
--    Recipients: the conversation's assignee if it has one; otherwise every member who can see
--    Communications (owner/admin, or a member granted the module) — was admins only.
--    Never blocks the message insert: a notification failure is logged and swallowed.
CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conv record;
  v_name text;
  v_preview text;
BEGIN
  IF NEW.direction <> 'inbound' OR NEW.historical_import THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT c.id, c.platform, c.assigned_to, c.workspace_id,
           NULLIF(btrim(COALESCE(k.first_name, '') || ' ' || COALESCE(k.last_name, '')), '') AS full_name,
           k.email, k.phone
      INTO v_conv
      FROM public.conversations c
      LEFT JOIN public.contacts k ON k.id = c.contact_id
     WHERE c.id = NEW.conversation_id;

    v_name := COALESCE(
      NULLIF(v_conv.full_name, 'Email User'),
      NULLIF(NEW.email_from_name, ''),
      v_conv.email,
      v_conv.phone,
      NULLIF(NEW.sender_handle, ''),
      'New message'
    );
    v_preview := substring(regexp_replace(COALESCE(NEW.content, ''), '\s+', ' ', 'g') FROM 1 FOR 140);
    IF v_preview = '' AND NEW.audio_url IS NOT NULL THEN
      v_preview := 'Voice note';
    END IF;

    INSERT INTO public.notifications (workspace_id, user_id, type, title, message, link, metadata)
    SELECT NEW.workspace_id, r.user_id, 'message', v_name, v_preview,
           '/conversations?c=' || NEW.conversation_id::text,
           jsonb_build_object(
             'conversation_id', NEW.conversation_id,
             'message_id', NEW.id,
             'platform', v_conv.platform,
             'contact_name', v_name,
             'subject', NEW.subject,
             'has_audio', NEW.audio_url IS NOT NULL
           )
      FROM (
        SELECT wm.user_id
          FROM public.workspace_members wm
          LEFT JOIN public.workspaces w ON w.id = wm.workspace_id
         WHERE wm.workspace_id = NEW.workspace_id
           AND wm.user_id IS NOT NULL
           AND (
             (v_conv.assigned_to IS NOT NULL AND wm.user_id = v_conv.assigned_to)
             OR (
               v_conv.assigned_to IS NULL
               AND (
                 wm.role IN ('owner', 'admin')
                 OR w.owner_id = wm.user_id
                 OR public.expand_module_permissions(wm.permissions) && ARRAY['communication']
               )
             )
           )
      ) r;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_message_notification failed for message %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- 6. notifications INSERT was open to any signed-in user for ANY user in ANY workspace ("Users can
--    insert notifications for any user", no check). The new toast makes notifications clickable, so a
--    forged one would be a convincing phishing lure. Every legitimate user-session writer (e.g. the
--    KYC trigger) writes to a member of its own workspace; server jobs use the service role.
DROP POLICY IF EXISTS "Users can insert notifications for any user" ON public.notifications;
CREATE POLICY "notifications_insert_same_workspace_member" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    check_workspace_access(workspace_id)
    AND EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.workspace_id = notifications.workspace_id AND m.user_id = notifications.user_id)
  );
