-- Gmail send (Conversations batch 4): mailbox ownership + retry-queue routing.
--
-- Rule: an email is only ever sent through the SENDER's own connected mailbox.
--
-- 1. The retry queue records who sent and through which mailbox. message_dispatch_queue is
--    service-role only (members cannot write it), so the worker sends from THESE columns and never
--    from messages.mailbox_id, which any workspace member can edit under the messages RLS policy.
ALTER TABLE public.message_dispatch_queue
  ADD COLUMN IF NOT EXISTS mailbox_id uuid REFERENCES public.email_mailboxes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sender_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. messages.mailbox_id cannot be pointed at someone else's mailbox from a user session (browser /
--    PostgREST, or a server action using the user's RLS client). The same-workspace composite FK
--    (20260930000008) already stops cross-tenant links; this closes the same-workspace teammate case.
--    Server jobs (service role: auth.uid() IS NULL) are trusted: inbound sync legitimately links mail
--    to whichever teammate's mailbox received it. Rows already linked keep their link when other
--    columns are edited.
CREATE OR REPLACE FUNCTION public.enforce_message_mailbox_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NEW.mailbox_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.mailbox_id IS NOT DISTINCT FROM OLD.mailbox_id THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.email_mailboxes mb
    WHERE mb.id = NEW.mailbox_id AND mb.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'A message can only be linked to your own connected mailbox'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_message_mailbox_owner() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_messages_mailbox_owner ON public.messages;
CREATE TRIGGER trg_messages_mailbox_owner
  BEFORE INSERT OR UPDATE OF mailbox_id ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_message_mailbox_owner();
