-- Relax RLS for notifications and enable realtime updates
-- This allows team members to insert notifications for each other

DROP POLICY IF EXISTS "Users can insert notifications for any user" ON public.notifications;
CREATE POLICY "Users can insert notifications for any user"
    ON public.notifications FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure replica identity is set to FULL for realtime tracking
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add notifications to the supabase_realtime publication for real-time stream subscription
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
