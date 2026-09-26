-- "One email conversation per contact" (the Conversations grouping rule) was only enforced by
-- find-then-insert in findOrCreateEmailConversation(). Gmail sync files messages in parallel and runs
-- the import alongside live sync, so two messages for a new contact could each create a conversation.
-- Enforce it in the database; the helper reuses the winner on a 23505. Verified 0 existing violations.
CREATE UNIQUE INDEX IF NOT EXISTS conversations_one_email_per_contact
  ON public.conversations (workspace_id, contact_id)
  WHERE platform = 'email' AND contact_id IS NOT NULL;
