import { logger } from '@/shared/logger';

export interface TranscribeResult {
  success: boolean;
  transcript?: string;
  error?: string;
  /** True when no ASSEMBLYAI_API_KEY is configured and a sandbox-safe placeholder was returned. */
  usedMock?: boolean;
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
 * src/lib/calendar/transcription.ts), same `en_za` locale tuning, same
 * sandbox-safe mock fallback when no API key is configured. NOT OpenAI
 * Whisper — Whisper isn't used for audio anywhere in this codebase today.
 *
 * Deliberately DOES poll to completion, unlike processMeetingAudio's call —
 * that caller only reads the initial submission response (which never
 * carries `text`, since /v2/transcript is asynchronous) and so falls through
 * to its mock transcript in practice. That's fine for a fire-and-forget
 * recap email; it is NOT fine here, since PRD 4.3 requires the agent to
 * review a real completed transcript before the email actually sends.
 */
export async function transcribeAudioWithAssemblyAI(audioUrl: string): Promise<TranscribeResult> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return {
      success: true,
      usedMock: true,
      transcript: 'This is a placeholder transcript — ASSEMBLYAI_API_KEY is not configured in this environment.',
    };
  }

  try {
    const submit = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_url: audioUrl, language_code: 'en_za' }),
    });
    const submitData = await submit.json();
    if (!submit.ok || !submitData?.id) {
      logger.error({ status: submit.status, err: submitData?.error }, 'voicenotes.assemblyai.submit_failed');
      return { success: false, error: submitData?.error || 'AssemblyAI submission failed' };
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
        return { success: false, error: pollData.error || 'AssemblyAI transcription failed' };
      }
      // 'queued' | 'processing' -> keep polling
    }

    logger.warn({ transcriptId: submitData.id }, 'voicenotes.assemblyai.poll_timeout');
    return { success: false, error: 'Transcription timed out' };
  } catch (err: any) {
    logger.error({ err }, 'voicenotes.assemblyai.request_failed');
    return { success: false, error: err.message || 'Transcription request failed' };
  }
}
