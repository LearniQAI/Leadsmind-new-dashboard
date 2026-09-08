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

  it('FAILS (no placeholder) when no API key is configured, and makes no network call', async () => {
    delete process.env.ASSEMBLYAI_API_KEY;
    const res = await transcribeAudioWithAssemblyAI('https://x/audio.webm');
    expect(res.success).toBe(false);
    expect(res.reason).toBe('not_configured');
    expect(res.error).toMatch(/not configured/i);
    expect(res.transcript).toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('submits with the real, AssemblyAI-supported "en" language code (regression for the en_za 400)', async () => {
    vi.useFakeTimers();
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'tx1', status: 'queued' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'completed', text: 'hi' }) });
    const promise = transcribeAudioWithAssemblyAI('https://x/audio.webm');
    await vi.runAllTimersAsync();
    await promise;
    const [, submitInit] = (global.fetch as any).mock.calls[0];
    expect(JSON.parse(submitInit.body)).toMatchObject({ language_code: 'en' });
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

    expect(res).toEqual({ success: false, reason: 'processing_failed', error: 'bad audio' });
  });

  it('returns a failure when the initial submission itself fails', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'invalid audio url' }) });
    const res = await transcribeAudioWithAssemblyAI('bad-url');
    expect(res.success).toBe(false);
    expect(res.reason).toBe('submit_failed');
    expect(res.error).toBe('invalid audio url');
  });

  it('the real 400 that started this — "Language code en_za is not supported" — is reported as submit_failed', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Language code en_za is not supported. See https://www.assemblyai.com/docs/concepts/supported-languages.' }),
    });
    const res = await transcribeAudioWithAssemblyAI('https://x/audio.webm');
    expect(res).toEqual({
      success: false,
      reason: 'submit_failed',
      error: 'Language code en_za is not supported. See https://www.assemblyai.com/docs/concepts/supported-languages.',
    });
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
    expect(res.reason).toBe('timeout');
    expect(res.error).toMatch(/timed out/i);
  });

  it('reports a network_error when the fetch itself throws', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('fetch failed'));
    const res = await transcribeAudioWithAssemblyAI('https://x/audio.webm');
    expect(res).toEqual({ success: false, reason: 'network_error', error: 'fetch failed' });
  });
});
