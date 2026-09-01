-- Lock down forum_posts / forum_comments, which the lockdown sweep in
-- 20260828000000_lockdown_remaining_public_tables.sql missed.
--
-- 20240101000097_phase56_public_forum_rls.sql ("Support Public Forum Access")
-- replaced the original workspace-scoped policies with USING (true) /
-- WITH CHECK (true) on SELECT / INSERT / ALL for both tables. That removed all
-- tenant isolation at the database layer: any anon or authenticated PostgREST
-- caller could read or write ANY of the (currently 83) workspaces' forum rows,
-- regardless of workspace membership.
--
-- Proven live (2026-08-31): an unauthenticated client (no session) inserted a
-- row into forum_posts targeting a workspace it has no membership in and the
-- insert succeeded; anon SELECT on both tables returned rows with no RLS
-- denial. The only remaining guard was the workspace_id FK (must reference a
-- real workspace) and the board CHECK constraint.
--
-- The "public forum" feature (src/app/community/page.tsx, PublicCommunityPage,
-- plus visitorName support in src/app/actions/forum.ts) was written as if a
-- single global forum exists — every code path resolves to "current workspace,
-- or the first workspace in the table". Nothing in the app or the phase56
-- migration intends workspace A's forum to be readable/writable by workspace B
-- users or by the public at large; the cross-workspace exposure is an
-- accidental side effect of USING (true) used as a blunt "allow anonymous"
-- instrument. That route is also not in the middleware public allowlist
-- (src/lib/supabase/middleware.ts), so there is no live anonymous entry point
-- to preserve. Case A applies: restore full workspace-scoped RLS (SELECT and
-- write), matching check_workspace_access() as used across the rest of the
-- schema and the sibling lockdown migration.
--
-- Caller audit (no behavior change for legitimate same-workspace users):
--   * src/app/actions/forum.ts — getForumPosts / getPostDetails / createForumPost
--     / addCommentToPost all run on the user-scoped createServerClient() and
--     already filter by the caller's own workspace_id. The LENA auto-reply
--     insert into forum_comments happens on a post the same user just created
--     in their own workspace, so the membership check passes.
--   * src/app/actions/lms.ts:getForumPosts() references non-existent columns
--     (parent_id, author:auth.users) and is imported nowhere — dead, already
--     broken, unaffected.

-- ---------------------------------------------------------------------------
-- forum_posts (has workspace_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public Read forum posts"            ON public.forum_posts;
DROP POLICY IF EXISTS "Public Insert forum posts"          ON public.forum_posts;
DROP POLICY IF EXISTS "Admins Modify forum posts"          ON public.forum_posts;
-- older names (pre-phase56), dropped defensively for idempotency
DROP POLICY IF EXISTS "Workspace Members View forum posts"   ON public.forum_posts;
DROP POLICY IF EXISTS "Workspace Members Create forum posts" ON public.forum_posts;

CREATE POLICY "Workspace members manage forum_posts" ON public.forum_posts
  FOR ALL TO authenticated
  USING (public.check_workspace_access(workspace_id))
  WITH CHECK (public.check_workspace_access(workspace_id));

-- ---------------------------------------------------------------------------
-- forum_comments (no workspace_id column; scoped via post_id -> forum_posts)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public Read comments"              ON public.forum_comments;
DROP POLICY IF EXISTS "Public Insert comments"            ON public.forum_comments;
DROP POLICY IF EXISTS "Workspace Members View comments"   ON public.forum_comments;
DROP POLICY IF EXISTS "Workspace Members Create comments" ON public.forum_comments;

CREATE POLICY "Workspace members manage forum_comments" ON public.forum_comments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.forum_posts p
    WHERE p.id = forum_comments.post_id
      AND public.check_workspace_access(p.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.forum_posts p
    WHERE p.id = forum_comments.post_id
      AND public.check_workspace_access(p.workspace_id)
  ));
