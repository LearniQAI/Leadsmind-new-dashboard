-- Audio advanced authoring lock, enforced at the RLS layer.
--
-- Speakers, speaker timeline, chapters and transcript are "Coming soon". The API routes already
-- refuse writes, but instructors could still write their own workspace's rows directly through
-- PostgREST (the permissive "workspace members access X" policies allow it). This closes that.
--
-- SINGLE SOURCE OF TRUTH: one row in public.form_feature_flags (the existing global flag table:
-- authenticated may SELECT, only the service role may write). The RLS policies below, the API
-- guard (src/lib/lms/audio/advancedAuthoringGuard.ts) and the builder UI all read this same row.
-- There is no env var and no sync step. Unlock both layers at once with:
--   UPDATE public.form_feature_flags SET is_enabled = true, updated_at = now()
--    WHERE flag_key = 'lms_audio_advanced_authoring';
--
-- Fails CLOSED: a missing row or an unreadable table (anon, or the row deleted) reads as locked.
--
-- Pure policy addition: no existing row is touched. Layered on top of the Batch 3 lms_role_gate_*
-- restrictive policies the same way (RESTRICTIVE, ANDed with every permissive policy). Reads are
-- not gated. service_role (BYPASSRLS) is unaffected, so the API routes (which write through the
-- service-role client after their own flag check) and FK cascades keep working.
--
-- Rollback: DROP POLICY lms_audio_authoring_lock_{ins,upd,del} on the five tables below,
-- DROP FUNCTION public.lms_audio_advanced_authoring_enabled(), and delete the flag row.

INSERT INTO public.form_feature_flags (flag_key, is_enabled, description)
VALUES (
  'lms_audio_advanced_authoring',
  false,
  'LMS audio: speakers, speaker timeline, chapters and transcript editing. false = locked ("Coming soon"): RLS, API and builder UI all refuse writes. Existing data still renders.'
)
ON CONFLICT (flag_key) DO NOTHING;

-- SECURITY INVOKER on purpose: authenticated can already read the flag table, so no definer
-- rights are needed; anon cannot read it and therefore gets false (locked).
CREATE OR REPLACE FUNCTION public.lms_audio_advanced_authoring_enabled()
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_enabled FROM public.form_feature_flags WHERE flag_key = 'lms_audio_advanced_authoring'),
    false
  );
$$;
REVOKE ALL ON FUNCTION public.lms_audio_advanced_authoring_enabled() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lms_audio_advanced_authoring_enabled() TO anon, authenticated, service_role;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['speakers', 'audio_lesson_speakers', 'audio_speaker_segments', 'transcript_segments', 'audio_chapters'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS lms_audio_authoring_lock_ins ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS lms_audio_authoring_lock_upd ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS lms_audio_authoring_lock_del ON public.%I', t);
    EXECUTE format('CREATE POLICY lms_audio_authoring_lock_ins ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (public.lms_audio_advanced_authoring_enabled())', t);
    EXECUTE format('CREATE POLICY lms_audio_authoring_lock_upd ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (public.lms_audio_advanced_authoring_enabled()) WITH CHECK (public.lms_audio_advanced_authoring_enabled())', t);
    EXECUTE format('CREATE POLICY lms_audio_authoring_lock_del ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (public.lms_audio_advanced_authoring_enabled())', t);
  END LOOP;
END $$;
