-- SEC S4 (2/3): a message can only point at a conversation in ITS OWN workspace.
--
-- Today a member (or anyone with a valid session) can insert a messages row whose workspace_id is theirs and whose
-- conversation_id belongs to another workspace: the only FK is conversation_id -> conversations(id), and the RLS check
-- (check_workspace_access(workspace_id)) never looks at the conversation. This adds the composite FK
-- (conversation_id, workspace_id) -> conversations(id, workspace_id).
--
-- NOT VALID: enforced for every new INSERT/UPDATE immediately, existing rows are not scanned here (no long lock); step 3 validates
-- after a read-only count shows 0 violations. ON DELETE CASCADE mirrors the existing single-column FK so deleting a conversation
-- (or a workspace) keeps cascading to its messages. messages.conversation_id is NOT NULL, so MATCH SIMPLE has no NULL escape.
--
-- Audit of every message insert site (webhooks/meta, resend inbound, twilio inbound, gmail sync/email store, Hub send and note,
-- dispatch retries): each takes workspace_id and conversation_id from the same resolved conversation, so legitimate code cannot violate
-- this; live data has 0 mismatches and 0 orphans.
set local lock_timeout = '3s';

alter table public.messages
  add constraint messages_conversation_workspace_fk
  foreign key (conversation_id, workspace_id)
  references public.conversations (id, workspace_id)
  on delete cascade
  not valid;
