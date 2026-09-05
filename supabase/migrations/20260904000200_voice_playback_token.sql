-- Email Channel Part 3 — opaque, unguessable link for the hosted voice-note
-- playback page (/voice-note/[token]), generated once per voice-note-email
-- send and stored against the real message record.
--
-- Deliberately a DEDICATED column, not the message's own primary key —
-- matching course_certificates.validation_id's discipline (a real PK should
-- never double as a public sharing token). Partial unique index mirrors the
-- client_message_uuid pattern from the Message Delivery Reliability work
-- (multiple NULLs must not clash).

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS voice_playback_token UUID;

COMMENT ON COLUMN public.messages.voice_playback_token IS
  'Opaque public token for the hosted voice-note playback page. NULL for every '
  'message except a voice-note-email send. Never derived from or equal to the '
  'row id.';

CREATE UNIQUE INDEX IF NOT EXISTS unique_voice_playback_token
  ON public.messages (voice_playback_token)
  WHERE voice_playback_token IS NOT NULL;
