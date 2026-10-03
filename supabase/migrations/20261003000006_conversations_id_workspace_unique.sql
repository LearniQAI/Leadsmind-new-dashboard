-- SEC S4 (1/3): give Postgres an (id, workspace_id) target so messages can carry a composite FK to conversations.
--
-- conversations.id is already the primary key, so this adds no real restriction (0 duplicate (id, workspace_id) pairs; the table has
-- 56 rows). It only creates the unique key a composite foreign key must reference. Not CONCURRENTLY: db push runs migrations in a
-- transaction, and a 3 s lock_timeout makes it fail fast instead of queueing behind a long query.
set local lock_timeout = '3s';

alter table public.conversations
  add constraint conversations_id_workspace_id_key unique (id, workspace_id);
