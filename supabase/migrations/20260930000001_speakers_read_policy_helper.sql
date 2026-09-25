-- Student audio speakers: replace the two nested-RLS read policies on `speakers` with one
-- SECURITY DEFINER helper, so reading speakers plans in milliseconds instead of ~22 s.
--
-- Problem (measured as a real enrolled student, EXPLAIN ANALYZE): the student player's read
-- `audio_lesson_speakers?select=...,speakers(*)` took 22.5 s to PLAN + 13.3 s to execute
-- (5,000+ subplans) against the `authenticated` role's 8 s statement_timeout, so it always
-- failed and the player silently showed no speakers. Cause: the policies below join through
-- audio_lesson_speakers -> content_blocks -> course_lessons -> courses / enrollments / contacts,
-- and every one of those tables is itself RLS-protected by policies that join through the
-- others; the planner inlines each nested policy at every level.
--
-- The helper evaluates the SAME effective rule — including what the nested RLS on those tables
-- was enforcing — explicitly, in one query that bypasses nested RLS (SECURITY DEFINER):
--   visible via a linked lesson L of course C when
--     [learning module not denied for L's and C's workspaces]            (module_access, authenticated only)
--     AND ( published path:  L visible (member of L's workspace, or enrolled in C, or
--                            C published AND (free OR L is a preview))
--                            AND C visible (member of C's workspace, or C.status = 'published')
--                            AND (C.published OR C.status = 'published')
--           OR enrolled path (authenticated): enrolled in C through a contact whose email is the
--                            caller's JWT email, that contact not module-denied )
-- "workspace members access speakers" (members of the speaker's own workspace) is unchanged, as
-- are all write policies. Access outcome verified identical before/after for anon, an enrolled
-- student, a non-enrolled user, members of this and another workspace, and a member without the
-- learning module, across published/free/preview/paid/draft/cross-workspace fixtures.

CREATE OR REPLACE FUNCTION public.lms_speaker_readable(p_speaker_id uuid, p_authenticated boolean)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH viewer AS (
    SELECT
      auth.uid() AS uid,
      CASE WHEN p_authenticated THEN auth.jwt() ->> 'email' END AS email,
      -- module_access RESTRICTIVE policies apply to `authenticated` only
      CASE WHEN p_authenticated THEN public.module_denied_workspaces('{learning}'::text[]) ELSE '{}'::uuid[] END AS learning_denied,
      CASE WHEN p_authenticated
           THEN public.module_denied_workspaces('{crm,marketing,communication,calendar,finance,commerce,learning}'::text[])
           ELSE '{}'::uuid[] END AS contacts_denied
  )
  SELECT EXISTS (
    SELECT 1
    FROM viewer v
    CROSS JOIN public.audio_lesson_speakers als
    JOIN public.content_blocks cb ON cb.id = als.content_block_id
    JOIN public.course_lessons cl ON cl.id = cb.lesson_id
    JOIN public.courses c ON c.id = cl.course_id
    CROSS JOIN LATERAL (
      SELECT
        NOT coalesce(cl.workspace_id = ANY (v.learning_denied), false) AS lesson_allowed,
        NOT coalesce(c.workspace_id = ANY (v.learning_denied), false) AS course_allowed,
        coalesce(p_authenticated AND EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = cl.workspace_id AND wm.user_id = v.uid), false) AS lesson_member,
        coalesce(p_authenticated AND EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = c.workspace_id AND wm.user_id = v.uid), false) AS course_member,
        coalesce(p_authenticated AND EXISTS (
          SELECT 1 FROM public.enrollments e
          JOIN public.contacts ct ON ct.id = e.contact_id
          WHERE e.course_id = cl.course_id
            AND ct.email = v.email
            AND NOT coalesce(ct.workspace_id = ANY (v.contacts_denied), false)), false) AS enrolled,
        coalesce(c.status = 'published' AND (c.pricing_model = 'free' OR cl.is_preview = true), false) AS open_lesson
    ) x
    WHERE als.speaker_id = p_speaker_id
      AND x.lesson_allowed
      AND (
        -- was "allow_public_select_speakers_published_courses"
        ( (x.lesson_member OR x.enrolled OR (x.open_lesson AND x.course_allowed))
          AND x.course_allowed
          AND (x.course_member OR coalesce(c.status = 'published', false))
          AND (coalesce(c.published, false) OR coalesce(c.status = 'published', false)) )
        -- was "students read speakers for enrolled courses"
        OR x.enrolled
      )
  );
$$;

REVOKE ALL ON FUNCTION public.lms_speaker_readable(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lms_speaker_readable(uuid, boolean) TO anon, authenticated;

DROP POLICY IF EXISTS "allow_public_select_speakers_published_courses" ON public.speakers;
DROP POLICY IF EXISTS "students read speakers for enrolled courses" ON public.speakers;

CREATE POLICY "lms_speakers_read_anon" ON public.speakers
  FOR SELECT TO anon
  USING (public.lms_speaker_readable(id, false));

CREATE POLICY "lms_speakers_read_authenticated" ON public.speakers
  FOR SELECT TO authenticated
  USING (public.lms_speaker_readable(id, true));
