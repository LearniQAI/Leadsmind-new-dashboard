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

  it('flags a mock transcript as source "mock"', async () => {
    state.transcribeResult = { success: true, transcript: 'placeholder', usedMock: true };
    const res: any = await transcribeVoiceNoteForEmail({ audioUrl: 'https://x/a.webm' });
    expect(res.source).toBe('mock');
  });

  it('degrades to the client-side transcript (with a warning) when out of AI credits — never blocks the send', async () => {
    state.creditError = new CreditLimitExceededError();
    const res: any = await transcribeVoiceNoteForEmail({ audioUrl: 'https://x/a.webm', clientTranscript: 'rough client guess' });
    expect(res.transcript).toBe('rough client guess');
    expect(res.source).toBe('client_fallback');
    expect(res.warning).toMatch(/out of ai credits/i);
  });

  it('degrades to the client-side transcript when AssemblyAI itself fails', async () => {
    state.transcribeResult = { success: false, error: 'network blip' };
    const res: any = await transcribeVoiceNoteForEmail({ audioUrl: 'https://x/a.webm', clientTranscript: 'rough client guess' });
    expect(res.transcript).toBe('rough client guess');
    expect(res.source).toBe('client_fallback');
    expect(res.warning).toMatch(/transcription failed/i);
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
