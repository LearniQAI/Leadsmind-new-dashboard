-- Pipelines: enable Supabase Realtime streaming so a stage move/add/delete
-- in one tab/user reflects live in another, without a manual refresh.
--
-- Same root cause as the earlier Communications Hub fix
-- (20260903000011_conversations_messages_realtime.sql): a client-side
-- `postgres_changes` subscription is only useful if the table is actually
-- in the `supabase_realtime` publication — `opportunities` was not.
-- Without this, PipelinesClient's new realtime subscription would attach
-- successfully and simply never receive an event, silently.
--
-- REPLICA IDENTITY FULL so old-row data is available on UPDATE/DELETE
-- (matches the same rationale as the messages/conversations migration).
-- RLS is already enabled on `opportunities` via
-- `check_workspace_access(workspace_id)` (20240101000002_phase2_initial_schema.sql),
-- which Realtime enforces per subscriber JWT the same way it enforces any
-- other SELECT — a subscriber only ever receives changes for workspaces
-- they belong to, independent of the client-side workspace_id filter.

ALTER TABLE public.opportunities REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'opportunities'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunities;
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
