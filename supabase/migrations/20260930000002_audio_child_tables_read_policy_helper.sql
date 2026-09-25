-- Audio lesson child tables: same fix as 20260930000001 (speakers), applied ahead of need to
-- audio_lesson_speakers, audio_speaker_segments, transcript_segments and audio_chapters.
--
-- Each table had the SAME three read paths (policy sets verified identical modulo table name),
-- all keyed on content_block_id, each joining content_blocks -> course_lessons -> courses /
-- enrollments / contacts — every one of those RLS-protected, so the planner inlines the nested
-- policies at every level. They measured 100-150 ms to plan today (one level shallower than
-- speakers, which reached 22 s); this removes the nesting before more policies stack up.
--
-- One shared helper, because the predicate is literally the same for all four tables. It
-- evaluates the EFFECTIVE rule of the two replaced policies, including what the nested RLS on
-- the joined tables enforced, for block B in lesson L of course C:
--   [learning module not denied for L's workspace]                       (module_access, authenticated only)
--   AND ( was "allow_public_select_*_published_courses":
--           L visible (member of L's workspace, or enrolled in C, or C published AND (free OR L preview)
--                      with learning not denied for C's workspace)
--           AND C visible (member of C's workspace, or C.status = 'published'; learning not denied)
--           AND (C.published OR C.status = 'published')
--         OR was "students read * for enrolled courses" (authenticated):
--           enrolled in C via a contact whose email is the caller's JWT email, not module-denied )
-- "workspace members access *" (the ALL policy, also used for writes) and every write/restrictive
-- policy are unchanged. Same shape as lms_speaker_readable() (speakers = this, reached through
-- an audio_lesson_speakers link). Access outcome verified identical before/after per table for
-- anon, enrolled student, non-enrolled user, members of this and another workspace, and a member
-- without the learning module.

CREATE OR REPLACE FUNCTION public.lms_audio_block_readable(p_block_id uuid, p_authenticated boolean)
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
      CASE WHEN p_authenticated THEN public.module_denied_workspaces('{learning}'::text[]) ELSE '{}'::uuid[] END AS learning_denied,
      CASE WHEN p_authenticated
           THEN public.module_denied_workspaces('{crm,marketing,communication,calendar,finance,commerce,learning}'::text[])
           ELSE '{}'::uuid[] END AS contacts_denied
  )
  SELECT EXISTS (
    SELECT 1
    FROM viewer v
    CROSS JOIN public.content_blocks cb
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
    WHERE cb.id = p_block_id
      AND x.lesson_allowed
      AND (
        ( (x.lesson_member OR x.enrolled OR (x.open_lesson AND x.course_allowed))
          AND x.course_allowed
          AND (x.course_member OR coalesce(c.status = 'published', false))
          AND (coalesce(c.published, false) OR coalesce(c.status = 'published', false)) )
        OR x.enrolled
      )
  );
$$;

REVOKE ALL ON FUNCTION public.lms_audio_block_readable(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lms_audio_block_readable(uuid, boolean) TO anon, authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['audio_lesson_speakers', 'audio_speaker_segments', 'transcript_segments', 'audio_chapters'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'allow_public_select_' || t || '_published_courses', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'students read ' || t || ' for enrolled courses', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon USING (public.lms_audio_block_readable(content_block_id, false))',
                   'lms_' || t || '_read_anon', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.lms_audio_block_readable(content_block_id, true))',
                   'lms_' || t || '_read_authenticated', t);
  END LOOP;
END $$;
