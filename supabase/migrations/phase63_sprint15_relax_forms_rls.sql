-- Allow full access to all forms for authenticated users during testing
-- This ensures multiplayer collaboration features can be tested across different accounts

-- Drop existing restrictive policies on forms
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.forms;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.forms;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.forms;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.forms;
DROP POLICY IF EXISTS "Forms are viewable by owner" ON public.forms;
DROP POLICY IF EXISTS "Forms are insertable by owner" ON public.forms;
DROP POLICY IF EXISTS "Forms are updatable by owner" ON public.forms;
DROP POLICY IF EXISTS "Forms are deletable by owner" ON public.forms;
DROP POLICY IF EXISTS "Users can view forms in their workspace" ON public.forms;
DROP POLICY IF EXISTS "Users can create forms in their workspace" ON public.forms;
DROP POLICY IF EXISTS "Users can update forms in their workspace" ON public.forms;
DROP POLICY IF EXISTS "Users can delete forms in their workspace" ON public.forms;

-- Ensure RLS is still technically enabled so we don't break realtime config, but add permissive policies
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read all forms"
ON public.forms FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert forms"
ON public.forms FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update all forms"
ON public.forms FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete all forms"
ON public.forms FOR DELETE
TO authenticated
USING (true);
