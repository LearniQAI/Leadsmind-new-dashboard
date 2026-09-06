import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  workspaceId: 'ws-1' as string | null,
  creditError: null as any,
  transcribeResult: { success: true, transcript: 'A real transcript' } as any,
}));

vi.mock('@/lib/auth', () => ({
  getCurrentWorkspaceId: async () => state.workspaceId,
}));

vi.mock('@/lib/ai/creditGuard', () => ({
  consumeAICredit: async () => {
    if (state.creditError) throw state.creditError;
  },
}));

vi.mock('@/lib/voicenotes/transcribeAudio', () => ({
  transcribeAudioWithAssemblyAI: async () => state.transcribeResult,
}));

import { transcribeVoiceNoteForEmail } from './voiceTranscription';
import { CreditLimitExceededError } from '@/shared/errors/AppError';

describe('transcribeVoiceNoteForEmail', () => {
  beforeEach(() => {
    state.workspaceId = 'ws-1';
    state.creditError = null;
    state.transcribeResult = { success: true, transcript: 'A real transcript' };
  });

  it('returns the real AssemblyAI transcript when credits and transcription both succeed', async () => {
    const res = await transcribeVoiceNoteForEmail({ audioUrl: 'https://x/a.webm', clientTranscript: 'rough client guess' });
    expect(res).toEqual({ transcript: 'A real transcript', source: 'assemblyai' });
  });

  it('out of AI credits -> soft-degrades to the genuine on-device transcript with a warning (a limit, not a failure)', async () => {
    state.creditError = new CreditLimitExceededError();
    const res: any = await transcribeVoiceNoteForEmail({ audioUrl: 'https://x/a.webm', clientTranscript: 'rough client guess' });
    expect(res.transcript).toBe('rough client guess');
    expect(res.source).toBe('client_fallback');
    expect(res.warning).toMatch(/out of ai credits/i);
  });

  it('AssemblyAI failure / missing key -> HARD BLOCK with an error, never a substituted transcript', async () => {
    state.transcribeResult = { success: false, error: 'network blip' };
    const res: any = await transcribeVoiceNoteForEmail({ audioUrl: 'https://x/a.webm', clientTranscript: 'rough client guess' });
    expect(res.error).toMatch(/was not sent/i);
    expect(res.transcript).toBeUndefined();
    expect(res.source).toBeUndefined();
  });

  it('requires an active workspace', async () => {
    state.workspaceId = null;
    const res: any = await transcribeVoiceNoteForEmail({ audioUrl: 'https://x/a.webm' });
    expect(res.error).toBeTruthy();
  });

  it('requires an audio url', async () => {
    const res: any = await transcribeVoiceNoteForEmail({ audioUrl: '' });
    expect(res.error).toBeTruthy();
  });
});
