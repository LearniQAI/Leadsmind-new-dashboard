import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  message: null as { id: string; metadata: any } | null,
  updates: [] as any[],
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: state.message }),
        }),
      }),
      update: (payload: any) => ({
        eq: async (_col: string, _val: string) => {
          state.updates.push(payload);
          return { error: null };
        },
      }),
    }),
  }),
}));

import { recordVoiceNoteClick } from './voiceClickTracking';

describe('recordVoiceNoteClick', () => {
  beforeEach(() => {
    state.message = null;
    state.updates = [];
  });

  it('ignores a URL that is not a voice-note playback link', async () => {
    const handled = await recordVoiceNoteClick('https://leadsmind.io/some/other/page');
    expect(handled).toBe(false);
    expect(state.updates).toHaveLength(0);
  });

  it('recognizes a voice-note link with no matching message as handled, but writes nothing', async () => {
    state.message = null;
    const handled = await recordVoiceNoteClick('https://app.leadsmind.io/voice-note/11111111-1111-1111-1111-111111111111?pos=top');
    expect(handled).toBe(true);
    expect(state.updates).toHaveLength(0);
  });

  it('appends a click record and increments the counter for a matched message', async () => {
    state.message = { id: 'msg-1', metadata: { transcript: 'hi', voice_clicks: [{ position: 'top', at: '2026-01-01T00:00:00.000Z' }], voice_click_count: 1 } };
    const handled = await recordVoiceNoteClick('https://app.leadsmind.io/voice-note/22222222-2222-2222-2222-222222222222?pos=bottom');

    expect(handled).toBe(true);
    expect(state.updates).toHaveLength(1);
    const meta = state.updates[0].metadata;
    expect(meta.transcript).toBe('hi'); // untouched fields preserved
    expect(meta.voice_click_count).toBe(2);
    expect(meta.voice_clicks).toHaveLength(2);
    expect(meta.voice_clicks[1].position).toBe('bottom');
  });

  it('records "unknown" position when the link has no pos query param', async () => {
    state.message = { id: 'msg-2', metadata: {} };
    await recordVoiceNoteClick('https://app.leadsmind.io/voice-note/33333333-3333-3333-3333-333333333333');
    expect(state.updates[0].metadata.voice_clicks[0].position).toBe('unknown');
  });
});
