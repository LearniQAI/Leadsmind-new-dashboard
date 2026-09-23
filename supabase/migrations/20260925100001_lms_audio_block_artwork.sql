-- Per-lesson custom artwork for Drive audio blocks (full player split layout: waveform + cover art).
--
-- Why a real column on content_blocks, not:
--  - audio_assets.artwork_url: one asset can be attached to MANY blocks (asset reuse,
--    20260923100002) — artwork set for one lesson would silently change every other lesson
--    reusing the same recording. Artwork is a per-lesson presentation choice.
--  - content_blocks.content JSON: the canvas AudioBlockEditor writes `content` by spreading its
--    own previously-loaded copy ({ ...block.content, mode }), so a key added from the separate
--    Audio Lesson Builder screen would be wiped by any later stale canvas save.
--  - courses.thumbnail_url (what the player used before): course-level, not lesson-chosen.
-- Every read path already selects content_blocks.* (student page, builder GET), so no query
-- changes are needed to carry it.

ALTER TABLE public.content_blocks
  ADD COLUMN IF NOT EXISTS audio_artwork_url text;

COMMENT ON COLUMN public.content_blocks.audio_artwork_url IS
  'Admin-uploaded cover art for a Drive audio block (public media-bucket URL under <workspace>/lms/audio-artwork/). NULL = no artwork: the full player shows the full-width live waveform.';
