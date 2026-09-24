// Lock for the Audio Lesson Builder's ADVANCED authoring: speakers (library + per-lesson), the
// speaker timeline, chapters and transcript lines. Locked ("Coming soon") until launch.
//
// This is an EDITING lock only. Nothing is deleted and no read path checks it: the student
// player, the Live Student Preview, the canvas player and the podcast chapters keep rendering any
// speakers/segments/chapters/transcript a lesson already has, exactly as before.
//
// SINGLE SOURCE OF TRUTH: one row in public.form_feature_flags (flag_key below). All three layers
// read that same row, so they cannot drift apart:
//  - RLS: restrictive lms_audio_authoring_lock_* policies on the five tables, via
//    public.lms_audio_advanced_authoring_enabled() (20260926110001_lms_audio_advanced_authoring_rls_lock.sql);
//  - API: every write handler of the five route families, via advancedAuthoringLockedResponse();
//  - UI: the builder's read-only summary and the Speaker Library page, via useAudioAdvancedAuthoringEnabled().
// Every layer fails CLOSED (missing row, read error, still loading = locked).
//
// To unlock (no deploy needed; takes effect on the next request / page load):
//   UPDATE public.form_feature_flags SET is_enabled = true, updated_at = now()
//    WHERE flag_key = 'lms_audio_advanced_authoring';
export const AUDIO_ADVANCED_AUTHORING_FLAG_KEY = 'lms_audio_advanced_authoring';

export const AUDIO_ADVANCED_AUTHORING_LOCKED_MESSAGE =
  'Speaker highlighting, chapters and transcripts are not yet available. They are coming soon.';
