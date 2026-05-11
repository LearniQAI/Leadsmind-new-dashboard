-- Migration to fix team permissions and "permission denied for table users"
-- This allows members of the same workspace to see each other's profiles

-- 1. Relax RLS on public.users to allow workspace-based visibility
DROP POLICY IF EXISTS "Workspace members can view each other" ON public.users;
CREATE POLICY "Workspace members can view each other"
    ON public.users FOR SELECT
    USING (
        id = auth.uid() -- Own profile
        OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members m1
            JOIN public.workspace_members m2 ON m1.workspace_id = m2.workspace_id
            WHERE m1.user_id = auth.uid() 
            AND m2.user_id = public.users.id
        )
    );

-- 2. Ensure invitations can be read by the recipient (by email)
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.workspace_invitations;
CREATE POLICY "Users can view their own invitations"
    ON public.workspace_invitations FOR SELECT
    USING (email = auth.jwt() ->> 'email');

-- 3. Grant SELECT on public.users to authenticated role
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.workspace_members TO authenticated;
GRANT SELECT ON public.workspace_invitations TO authenticated;
