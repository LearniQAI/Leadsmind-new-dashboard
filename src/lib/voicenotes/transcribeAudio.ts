import { logger } from '@/shared/logger';

/**
 * Discriminates *why* a transcription failed, independent of the raw `error`
 * text (which is AssemblyAI's own wording, logged server-side but not always
 * fit for an agent-facing toast). Lets callers show a distinct, actionable
 * message per failure mode instead of one generic "Transcription failed" —
 * added after a real incident where a missing-key failure and an invalid
 * language-code failure produced the identical toast, making the two
 * indistinguishable without a log dive.
 */
export type TranscribeFailureReason =
  | 'not_configured' // ASSEMBLYAI_API_KEY missing
  | 'submit_failed' // AssemblyAI rejected the submit-for-transcription request
  | 'processing_failed' // AssemblyAI accepted the job but it errored out
  | 'timeout' // job never completed within the poll window
  | 'network_error'; // the request to AssemblyAI itself failed (fetch threw)

export interface TranscribeResult {
  success: boolean;
  transcript?: string;
  error?: string;
  reason?: TranscribeFailureReason;
}

const POLL_INTERVAL_MS = 1800;
// ~25s ceiling. Short voice notes (<=2min, per PRD 4.2's recommended cap)
// transcribe well within this on AssemblyAI in practice.
const MAX_POLL_ATTEMPTS = 14;

/**
 * Real, server-side speech-to-text for an email voice note.
 *
 * Reuses AssemblyAI — the same provider already integrated for the calendar
 * meeting-recap pipeline (processMeetingAudio() in
 * src/lib/calendar/transcription.ts). NOT OpenAI Whisper — Whisper isn't used
 * for audio anywhere in this codebase today.
 *
 * Deliberately DOES poll to completion, unlike processMeetingAudio's call —
 * that caller only reads the initial submission response (which never
 * carries `text`, since /v2/transcript is asynchronous) and so falls through
 * to its mock transcript in practice. That's fine for a fire-and-forget
 * recap email; it is NOT fine here, since PRD 4.3 requires the agent to
 * review a real completed transcript before the email actually sends.
 *
 * When no ASSEMBLYAI_API_KEY is configured this now FAILS
 * (`{ success: false }`) rather than returning a placeholder string — a
 * missing key previously caused literal "placeholder transcript" debug text
 * to be shipped as real message content to real recipients.
 */
export async function transcribeAudioWithAssemblyAI(audioUrl: string): Promise<TranscribeResult> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    logger.error({}, 'voicenotes.assemblyai.key_missing');
    return { success: false, reason: 'not_configured', error: 'Voice transcription is not configured (ASSEMBLYAI_API_KEY missing).' };
  }

  try {
    const submit = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      // 'en_za' is not a real AssemblyAI language code (confirmed via a live
      // 400: "Language code en_za is not supported") — every attempt failed
      // at the submit step. AssemblyAI's supported English codes are
      // en/en_us/en_uk/en_au; there is no South-Africa-specific one, so this
      // uses the general 'en' model rather than an invented code.
      body: JSON.stringify({ audio_url: audioUrl, language_code: 'en' }),
    });
    const submitData = await submit.json();
    if (!submit.ok || !submitData?.id) {
      logger.error({ status: submit.status, err: submitData?.error }, 'voicenotes.assemblyai.submit_failed');
      return { success: false, reason: 'submit_failed', error: submitData?.error || 'AssemblyAI submission failed' };
    }

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const poll = await fetch(`https://api.assemblyai.com/v2/transcript/${submitData.id}`, {
        headers: { Authorization: apiKey },
      });
      const pollData = await poll.json();

      if (pollData.status === 'completed') {
        return { success: true, transcript: pollData.text || '' };
      }
      if (pollData.status === 'error') {
        logger.error({ err: pollData.error, transcriptId: submitData.id }, 'voicenotes.assemblyai.transcription_error');
        return { success: false, reason: 'processing_failed', error: pollData.error || 'AssemblyAI transcription failed' };
      }
      // 'queued' | 'processing' -> keep polling
    }

    logger.warn({ transcriptId: submitData.id }, 'voicenotes.assemblyai.poll_timeout');
    return { success: false, reason: 'timeout', error: 'Transcription timed out' };
  } catch (err: any) {
    logger.error({ err }, 'voicenotes.assemblyai.request_failed');
    return { success: false, reason: 'network_error', error: err.message || 'Transcription request failed' };
  }
}
