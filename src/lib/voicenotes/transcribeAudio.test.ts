import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transcribeAudioWithAssemblyAI } from './transcribeAudio';

describe('transcribeAudioWithAssemblyAI', () => {
  const realFetch = global.fetch;
  const realKey = process.env.ASSEMBLYAI_API_KEY;

  beforeEach(() => {
    global.fetch = vi.fn() as any;
    process.env.ASSEMBLYAI_API_KEY = 'test-key';
  });
  afterEach(() => {
    global.fetch = realFetch;
    process.env.ASSEMBLYAI_API_KEY = realKey;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns a sandbox-safe mock transcript when no API key is configured (no network call)', async () => {
    delete process.env.ASSEMBLYAI_API_KEY;
    const res = await transcribeAudioWithAssemblyAI('https://x/audio.webm');
    expect(res).toMatchObject({ success: true, usedMock: true });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('polls until completed and returns the real transcript', async () => {
    vi.useFakeTimers();
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'tx1', status: 'queued' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'processing' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'completed', text: 'Hello world' }) });

    const promise = transcribeAudioWithAssemblyAI('https://x/audio.webm');
    await vi.runAllTimersAsync();
    const res = await promise;

    expect(res).toEqual({ success: true, transcript: 'Hello world' });
  });

  it('returns a failure when AssemblyAI reports status=error', async () => {
    vi.useFakeTimers();
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'tx2', status: 'queued' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'error', error: 'bad audio' }) });

    const promise = transcribeAudioWithAssemblyAI('https://x/audio.webm');
    await vi.runAllTimersAsync();
    const res = await promise;

    expect(res).toEqual({ success: false, error: 'bad audio' });
  });

  it('returns a failure when the initial submission itself fails', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'invalid audio url' }) });
    const res = await transcribeAudioWithAssemblyAI('bad-url');
    expect(res.success).toBe(false);
    expect(res.error).toBe('invalid audio url');
  });

  it('gives up and reports a timeout if it never completes', async () => {
    vi.useFakeTimers();
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'tx3', status: 'queued' }) })
      .mockResolvedValue({ ok: true, json: async () => ({ status: 'processing' }) });

    const promise = transcribeAudioWithAssemblyAI('https://x/audio.webm');
    await vi.runAllTimersAsync();
    const res = await promise;

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/timed out/i);
  });
});
