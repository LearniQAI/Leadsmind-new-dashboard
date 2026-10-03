-- SEC S4 (3/3): validate the composite FK against existing rows.
--
-- A read-only count immediately before this migration returned 0 messages whose (conversation_id, workspace_id) has no matching
-- conversation. VALIDATE scans messages once under SHARE UPDATE EXCLUSIVE (reads and writes continue) and fails the migration, changing
-- nothing, if a violating row appeared in between.
alter table public.messages validate constraint messages_conversation_workspace_fk;
