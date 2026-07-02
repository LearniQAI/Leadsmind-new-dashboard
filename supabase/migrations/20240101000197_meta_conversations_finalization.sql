-- Alter conversations table to add assignment, status, and tags columns
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('open', 'in_progress', 'waiting_for_client', 'resolved', 'spam')) DEFAULT 'open',
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_customer_message_at timestamp with time zone;

-- Create quick_replies table
CREATE TABLE IF NOT EXISTS public.quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  shortcut text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_workspace_shortcut UNIQUE (workspace_id, shortcut)
);

-- Enable RLS for quick_replies
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated to select quick replies" ON public.quick_replies
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated to manage quick replies" ON public.quick_replies
  FOR ALL USING (true);

-- Alter contacts table to support compliance tracking
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS opted_in boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS opted_out boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS opt_out_date timestamp with time zone;
