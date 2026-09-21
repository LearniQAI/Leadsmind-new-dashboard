-- LMS batch 3 / fix 5: "any workspace member" was enough to WRITE (and, for a few sensitive tables, READ)
-- LMS data straight through PostgREST, even though every LMS API route/action gates on
-- requireLmsInstructor() = role IN ('admin','member') (src/lib/lms/access.ts: 'member' = internal team member,
-- as opposed to client/viewer/hr/payroll/compliance). workspace_members.role allows all seven values; prod
-- currently has only 74 admin + 2 member, so THIS CHANGES NOTHING for any existing user today — it closes the
-- door for a future viewer/client/hr/... invite.
--
-- Implemented as RESTRICTIVE policies (ANDed with the existing permissive ones) so no existing policy is
-- rewritten or dropped. lms_member_role_ok(ws) is false ONLY for a caller who IS a member of `ws` with a
-- non-instructor role; non-members (students, anon) are unaffected, so student policies keep working.
--   * writes (INSERT/UPDATE/DELETE) gated on every instructor-managed LMS table;
--   * SELECT additionally gated where the data is sensitive to a non-instructor member: quiz answer keys,
--     remedial answer keys, student submissions, expert profiles (email / rate).
-- Scope: LMS tables only. The other ~110 check_workspace_access policies (CRM, HR, marketing, ...) have their
-- own role models and were deliberately NOT touched here (see batch report).
-- Rollback: DROP POLICY "lms_role_gate_*" on each table (names below) and DROP FUNCTION public.lms_member_role_ok(uuid).

CREATE OR REPLACE FUNCTION public.lms_member_role_ok(target_workspace_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
           SELECT 1 FROM public.workspace_members
            WHERE workspace_id = target_workspace_id AND user_id = auth.uid())
      OR EXISTS (
           SELECT 1 FROM public.workspace_members
            WHERE workspace_id = target_workspace_id AND user_id = auth.uid()
              AND role IN ('admin', 'member'));
$$;
REVOKE ALL ON FUNCTION public.lms_member_role_ok(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lms_member_role_ok(uuid) TO anon, authenticated, service_role;

DO $$
DECLARE
  -- table, expression yielding that row's workspace id, gate SELECT too?
  spec text[][] := ARRAY[
    ['courses',                    'workspace_id', 'n'],
    ['course_modules',             'workspace_id', 'n'],
    ['course_lessons',             'workspace_id', 'n'],
    ['course_categories',          'workspace_id', 'n'],
    ['course_cohorts',             'workspace_id', 'n'],
    ['course_progress',            'workspace_id', 'n'],
    ['course_certificates',        'workspace_id', 'n'],
    ['course_content_chunks',      'workspace_id', 'n'],
    ['lesson_summaries',           'workspace_id', 'n'],
    ['lms_automation_rules',       'workspace_id', 'n'],
    ['lms_bundles',                'workspace_id', 'n'],
    ['lms_bundle_enrollments',     'workspace_id', 'n'],
    ['quiz_attempts',              'workspace_id', 'n'],
    ['module_quiz_attempts',       'workspace_id', 'n'],
    ['quiz_questions',             'workspace_id', 'y'],
    ['module_quiz_questions',      'workspace_id', 'y'],
    ['lms_assignment_submissions', 'workspace_id', 'y'],
    ['lms_expert_profiles',        'workspace_id', 'y'],
    ['content_blocks',             '(SELECT cl.workspace_id FROM public.course_lessons cl WHERE cl.id = lesson_id)', 'n'],
    ['quiz_settings',              '(SELECT cl.workspace_id FROM public.course_lessons cl WHERE cl.id = lesson_id)', 'n'],
    ['module_quiz_settings',       '(SELECT m.workspace_id FROM public.course_modules m WHERE m.id = module_id)', 'n'],
    ['flashcard_reviews',          '(SELECT cl.workspace_id FROM public.content_blocks cb JOIN public.course_lessons cl ON cl.id = cb.lesson_id WHERE cb.id = content_block_id)', 'n'],
    ['lms_remedial_assignments',   '(SELECT c.workspace_id FROM public.courses c WHERE c.id = course_id)', 'y'],
    ['lms_expert_sessions',        '(SELECT p.workspace_id FROM public.lms_expert_profiles p WHERE p.id = expert_id)', 'n'],
    ['lms_expert_availabilities',  '(SELECT p.workspace_id FROM public.lms_expert_profiles p WHERE p.id = expert_id)', 'n'],
    ['lms_session_recordings',     '(SELECT p.workspace_id FROM public.lms_expert_sessions s JOIN public.lms_expert_profiles p ON p.id = s.expert_id WHERE s.id = session_id)', 'n'],
    ['lms_session_chats',          '(SELECT c.workspace_id FROM public.lms_expert_sessions s JOIN public.courses c ON c.id = s.course_id WHERE s.id = session_id)', 'n'],
    ['lms_session_rsvps',          '(SELECT c.workspace_id FROM public.lms_expert_sessions s JOIN public.courses c ON c.id = s.course_id WHERE s.id = session_id)', 'n']
  ];
  i int;
  t text; e text; sel text; chk text;
BEGIN
  FOR i IN 1 .. array_length(spec, 1) LOOP
    t := spec[i][1]; e := spec[i][2]; sel := spec[i][3];
    chk := format('public.lms_member_role_ok(%s)', e);

    EXECUTE format('DROP POLICY IF EXISTS lms_role_gate_ins ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS lms_role_gate_upd ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS lms_role_gate_del ON public.%I', t);
    EXECUTE format('CREATE POLICY lms_role_gate_ins ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (%s)', t, chk);
    EXECUTE format('CREATE POLICY lms_role_gate_upd ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', t, chk, chk);
    EXECUTE format('CREATE POLICY lms_role_gate_del ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (%s)', t, chk);

    IF sel = 'y' THEN
      EXECUTE format('DROP POLICY IF EXISTS lms_role_gate_sel ON public.%I', t);
      EXECUTE format('CREATE POLICY lms_role_gate_sel ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (%s)', t, chk);
    END IF;
  END LOOP;
END $$;
