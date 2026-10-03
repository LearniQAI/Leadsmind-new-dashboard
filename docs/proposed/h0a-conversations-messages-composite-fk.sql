-- PROPOSED, NOT APPLIED. Lives outside supabase/migrations on purpose so `supabase db push` can never pick it up.
-- H0a follow-up: make it structurally impossible for a messages row to point at a conversation in another workspace.
--
-- Live state when this was written (read-only counts, 2026-10-03):
--   messages whose workspace_id differs from their conversation's workspace_id : 0
--   messages with no conversation (orphans)                                      : 0
--   messages 158, conversations 43
--   conversations constraints: PRIMARY KEY (id), UNIQUE (workspace_id, platform, external_thread_id)
--   messages FK: conversation_id -> conversations(id) ON DELETE CASCADE (no workspace tie)
--
-- Order of operations (ONE statement block at a time; run the verification query after each; stop on any surprise):
--
-- 1. Verify there is nothing to clean up (must return 0 and 0):
--      select count(*) from messages m join conversations c on c.id = m.conversation_id where m.workspace_id <> c.workspace_id;
--      select count(*) from messages m where not exists (select 1 from conversations c where c.id = m.conversation_id);
--
-- 2. Unique key the composite FK can reference. `id` is already unique, so this adds no real restriction; it only gives
--    Postgres a (id, workspace_id) target. CONCURRENTLY avoids a long lock; it cannot run inside a transaction block.
create unique index concurrently if not exists conversations_id_workspace_id_key
  on public.conversations (id, workspace_id);

alter table public.conversations
  add constraint conversations_id_workspace_id_uniq unique using index conversations_id_workspace_id_key;

-- 3. Composite FK, NOT VALID: enforced for every NEW insert/update immediately, existing rows are not scanned (no long lock).
--    ON DELETE CASCADE mirrors the existing single-column FK so conversation deletes keep cascading to messages.
alter table public.messages
  add constraint messages_conversation_workspace_fk
  foreign key (conversation_id, workspace_id)
  references public.conversations (id, workspace_id)
  on delete cascade
  not valid;

-- 4. Cleanup for any violating rows IF step 1 ever returns > 0 at the time of running (it is 0 today). Do NOT delete blindly:
--    first copy the offenders aside, then decide per row (re-home to the conversation's workspace, or delete).
--      create table if not exists public._h0a_message_violations as
--        select m.* from messages m join conversations c on c.id = m.conversation_id where m.workspace_id <> c.workspace_id;
--    Re-home (keeps the message, fixes the tenant):
--      update messages m set workspace_id = c.workspace_id
--        from conversations c where c.id = m.conversation_id and m.workspace_id <> c.workspace_id;
--    (Review the copy table with a human before choosing re-home vs delete.)

-- 5. Validate (scans the table once under a SHARE UPDATE EXCLUSIVE lock; reads and writes continue). Fails if any row violates.
alter table public.messages validate constraint messages_conversation_workspace_fk;

-- 6. Optional, after step 5 has been live for a release: the old single-column FK is now redundant for integrity.
--    Leave it in place unless planner/cascade cost matters; dropping it is a separate decision.
--
-- Rollback: alter table public.messages drop constraint messages_conversation_workspace_fk;
--           alter table public.conversations drop constraint conversations_id_workspace_id_uniq;
--
-- Notes
--  * Edge: contact-alias sends (`contact:<id>`) resolve to real conversation ids first, so they are unaffected.
--  * Inserts that omit workspace_id are impossible today (NOT NULL), so the composite FK cannot reject legitimate code paths
--    once the application-level checks from H0a are deployed. Run the live H0a tests against a staging copy first if available.
