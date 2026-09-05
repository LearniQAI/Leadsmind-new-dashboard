'use server';

import { getCurrentWorkspaceId } from '@/lib/auth';
import { consumeAICredit } from '@/lib/ai/creditGuard';
import { CreditLimitExceededError } from '@/shared/errors/AppError';
import { transcribeAudioWithAssemblyAI } from '@/lib/voicenotes/transcribeAudio';
import { logger } from '@/shared/logger';

export interface TranscribeVoiceNoteResult {
  transcript: string;
  source: 'assemblyai' | 'client_fallback' | 'mock';
  warning?: string;
}

/**
 * Server-side transcription for an email voice note (Email Channel Part 2,
 * PRD 4.3). The email composer's review-before-send step needs a real,
 * completed transcript — the live client-side Web Speech pass chat voice
 * notes already use is best-effort and often incomplete, so it's kept only as
 * `clientTranscript`, a fallback for when the real transcription can't run.
 *
 * Credit-gated via the same `deduct_ai_credit` RPC other AI features in this
 * platform use (creditGuard.ts) — a deliberate fix for THIS call. The
 * pre-existing gap (processMeetingAudio's AssemblyAI/OpenAI calls are not
 * credit-gated) is left alone, per the explicit decision to treat that as a
 * separate, optional follow-up rather than something to fix here.
 *
 * Never blocks the send over credits or a transcription failure — both
 * degrade to the client-side fallback with a clear warning, since the PRD's
 * hard requirement is "never auto-sent blind," not "always AI-transcribed."
 */
export async function transcribeVoiceNoteForEmail(params: {
  audioUrl: string;
  clientTranscript?: string;
}): Promise<TranscribeVoiceNoteResult | { error: string }> {
  const { audioUrl, clientTranscript } = params;

  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No active workspace context' };
    if (!audioUrl) return { error: 'No audio to transcribe' };

    try {
      await consumeAICredit(workspaceId, 1);
    } catch (creditErr) {
      const isLimit = creditErr instanceof CreditLimitExceededError;
      logger.warn({ err: creditErr, workspaceId, isLimit }, 'voice_transcription.credit_gate.degraded');
      return {
        transcript: clientTranscript || '',
        source: 'client_fallback',
        warning: isLimit
          ? 'Out of AI credits this cycle — showing the on-device transcript instead. Please review carefully before sending.'
          : 'AI transcription is temporarily unavailable — showing the on-device transcript instead. Please review carefully before sending.',
      };
    }

    const result = await transcribeAudioWithAssemblyAI(audioUrl);
    if (!result.success) {
      logger.error({ err: result.error, workspaceId }, 'voice_transcription.assemblyai.failed');
      return {
        transcript: clientTranscript || '',
        source: 'client_fallback',
        warning: 'Transcription failed — showing the on-device transcript instead. Please review carefully before sending.',
      };
    }

    return {
      transcript: result.transcript || clientTranscript || '',
      source: result.usedMock ? 'mock' : 'assemblyai',
    };
  } catch (err: any) {
    logger.error({ err }, 'voice_transcription.unexpected_failure');
    return { error: 'Transcription failed unexpectedly' };
  }
}
