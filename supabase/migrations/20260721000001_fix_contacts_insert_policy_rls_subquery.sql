-- Follow-up to 20260721000000: the previous policy's EXISTS subquery against
-- public.pages runs under the calling (anon) role, and pages itself is RLS-
-- restricted to workspace members ("Workspace access for pages"), so the
-- subquery always saw zero rows for an anonymous caller and the EXISTS check
-- was always false — this broke the legitimate public form-submission flow
-- entirely (verified live: even a real page's own workspace was rejected).
--
-- Fix: check page/workspace membership through a SECURITY DEFINER function
-- (owned by postgres, bypasses RLS internally) instead of a plain subquery, so
-- the policy can validate "does this workspace have a real page" without
-- granting anon direct read access to the pages table.

CREATE OR REPLACE FUNCTION public.workspace_has_pages(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pages WHERE pages.workspace_id = p_workspace_id
  );
$$;

REVOKE ALL ON FUNCTION public.workspace_has_pages(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.workspace_has_pages(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Public form submissions" ON public.contacts;

CREATE POLICY "Public form submissions"
    ON public.contacts FOR INSERT
    WITH CHECK (
        public.workspace_has_pages(contacts.workspace_id)
    );
