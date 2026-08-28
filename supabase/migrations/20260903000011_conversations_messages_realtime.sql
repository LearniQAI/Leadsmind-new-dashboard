-- Communications Hub: enable Supabase Realtime streaming for live message delivery.
--
-- Root cause of the "real-time message delivery delay": ConversationsClient has
-- wired a `postgres_changes` subscription on `messages` / `conversations` since
-- the unified migration, but neither table was ever added to the
-- `supabase_realtime` publication (only tasks, notifications, blog_posts, etc.
-- were opted in). Postgres therefore never streamed row changes to the Realtime
-- server, the client callback never fired, and new inbound messages only
-- appeared after a manual page refresh (the server-rendered initial fetch).
--
-- Fix: add both tables to the publication and set REPLICA IDENTITY FULL so the
-- Realtime `workspace_id=eq.<id>` filter (and old-row data on UPDATE/DELETE)
-- works. RLS is already enabled on both tables via
-- `check_workspace_access(workspace_id)` (20240101000004_phase3_messaging.sql),
-- and Realtime enforces those same SELECT policies per subscriber JWT, so a
-- subscriber only ever receives changes for workspaces they belong to.

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
