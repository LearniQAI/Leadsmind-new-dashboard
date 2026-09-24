-- Per-lesson waveform colour for Drive audio blocks (admin-chosen, contrast-validated).
--
-- Lives next to audio_artwork_url on content_blocks for the same reasons (see
-- 20260925100001_lms_audio_block_artwork.sql): one audio_asset can be reused by many lessons, so
-- an asset-level colour would leak across lessons; and a key inside `content` would be wiped by
-- the canvas AudioBlockEditor's stale-spread saves.
--
-- Stores the admin's RAW pick only. The rendered colour is derived at render time by
-- waveformColorFor() (src/lib/lms/audio/waveformColor.ts), which darkens it until it clears
-- 3:1 on the waveform field. The guarantee therefore never depends on what is stored here.
-- NULL = the default monochrome waveform, unchanged.

ALTER TABLE public.content_blocks
  ADD COLUMN IF NOT EXISTS audio_waveform_color text;

ALTER TABLE public.content_blocks
  DROP CONSTRAINT IF EXISTS content_blocks_audio_waveform_color_hex;
ALTER TABLE public.content_blocks
  ADD CONSTRAINT content_blocks_audio_waveform_color_hex
  CHECK (audio_waveform_color IS NULL OR audio_waveform_color ~ '^#[0-9A-F]{6}$');

COMMENT ON COLUMN public.content_blocks.audio_waveform_color IS
  'Admin-picked waveform colour for a Drive audio block, #RRGGBB upper-case, as picked (not contrast-adjusted; the player adjusts at render time). NULL = default monochrome.';
