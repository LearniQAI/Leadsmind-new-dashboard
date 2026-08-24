-- Critical/Medium fix (Blog/Email-Campaign re-audit): "Public can view approved
-- comments" ON blog_comments FOR SELECT USING (status = 'approved') has no
-- column restriction — RLS is row-level only, so it returned the full row,
-- including author_email, to any anonymous PostgREST caller. Confirmed live:
-- an unauthenticated client querying blog_comments?status=eq.approved got back
-- a real commenter's email address across workspace boundaries. Workspace
-- members still get full-row access (including email) via the existing
-- "Users can manage workspace comments" policy — only the public/anonymous
-- path is affected here.
DROP POLICY IF EXISTS "Public can view approved comments" ON public.blog_comments;

-- A public-safe projection: approved comments only, with author_email (and
-- workspace_id) excluded. The view's WHERE clause is the actual access
-- control here, not RLS pass-through, so it stays correct regardless of the
-- view-ownership/BYPASSRLS nuances that apply to Postgres views.
CREATE OR REPLACE VIEW public.blog_comments_public AS
SELECT id, post_id, author_name, content, created_at
FROM public.blog_comments
WHERE status = 'approved';

GRANT SELECT ON public.blog_comments_public TO anon, authenticated;
