import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({ row: null as any }));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: state.row }),
        }),
      }),
    }),
  }),
}));

import VoiceNotePlaybackPage from './page';

describe('VoiceNotePlaybackPage — public hosted playback (Email Channel Part 3)', () => {
  beforeEach(() => { state.row = null; });

  it('renders a not-found state for an unknown/expired token, exposing nothing', async () => {
    const el = await VoiceNotePlaybackPage({ params: { token: 'does-not-exist' } });
    const html = renderToStaticMarkup(el as any);
    expect(html).toContain('Voice message not found');
  });

  it('renders the player + sender/workspace snapshot for a real token, and nothing else about the message', async () => {
    state.row = {
      audio_url: 'https://cdn.example.com/note.webm',
      audio_duration: 42,
      sent_at: '2026-09-04T10:00:00.000Z',
      metadata: { voice_playback_snapshot: { sender_name: 'Jane Doe', workspace_name: 'World Teachers Academy', brand_color: '#5C4AC7' }, transcript: 'private internal transcript text' },
    };

    const el = await VoiceNotePlaybackPage({ params: { token: '22222222-2222-2222-2222-222222222222' } });
    const html = renderToStaticMarkup(el as any);

    expect(html).toContain('Jane Doe');
    expect(html).toContain('World Teachers Academy');
    // Only the fields the lookup selects are ever available to render — the
    // page has no access to contact/workspace ids, email addresses, etc.
    expect(html).not.toContain('private internal transcript text');
  });
});
