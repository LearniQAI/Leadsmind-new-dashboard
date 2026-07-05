-- Fix: infinite recursion in RLS policy on public.workspace_members
CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "Workspace admins can manage memberships" 
ON public.workspace_members;

CREATE POLICY "Workspace admins can manage memberships"
    ON public.workspace_members FOR ALL
    USING (public.is_workspace_admin(workspace_id))
    WITH CHECK (public.is_workspace_admin(workspace_id));
