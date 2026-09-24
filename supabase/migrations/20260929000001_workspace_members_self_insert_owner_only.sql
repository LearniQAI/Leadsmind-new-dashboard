-- SECURITY FIX: "Users can insert their own membership" only checked user_id = auth.uid(),
-- so ANY authenticated user could insert a workspace_members row into ANY workspace (with any
-- role, including 'admin') straight through PostgREST and immediately read/modify all of that
-- workspace's data. Proven live with a rolled-back probe (outsider user joined a foreign
-- workspace as admin and could read its contacts).
--
-- The only legitimate self-insert on the user-scoped client is createWorkspace()
-- (src/app/actions/workspace.ts): the creator adds themselves to the workspace they just
-- created and own. Invitation acceptance, direct-create and signup all insert via the service
-- role / SECURITY DEFINER trigger and are unaffected by this policy.

CREATE OR REPLACE FUNCTION public.is_workspace_owner(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = p_workspace_id AND w.owner_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_workspace_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_workspace_owner(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can insert their own membership" ON public.workspace_members;

CREATE POLICY "Users can insert their own membership"
  ON public.workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_workspace_owner(workspace_id)
  );
