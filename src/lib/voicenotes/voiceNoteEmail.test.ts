import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  workspace: { name: 'World Teachers Academy' } as any,
  branding: { logo_url: 'https://x/logo.png', primary_color: '#5C4AC7' } as any,
  existingMessageMeta: { client_message_uuid: 'uuid-1', transcript: null } as any,
  updates: [] as any[],
  sendEmailCalls: [] as any[],
  emailConfig: null as any,
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (table === 'workspaces') return { data: state.workspace };
            if (table === 'workspace_branding') return { data: state.branding };
            if (table === 'messages') return { data: { metadata: state.existingMessageMeta } };
            return { data: null };
          },
        }),
      }),
      update: (payload: any) => ({
        eq: async () => {
          state.updates.push(payload);
          return { error: null };
        },
      }),
    }),
  }),
}));

vi.mock('@/lib/email', () => ({
  sendEmail: async (args: any) => {
    state.sendEmailCalls.push(args);
    return { id: 'resend-id-1' };
  },
}));

vi.mock('@/lib/email/resolveConfig', () => ({
  getWorkspaceEmailConfig: async () => state.emailConfig,
}));

import { sendVoiceNoteEmail } from './voiceNoteEmail';

describe('sendVoiceNoteEmail — waveform template (Email Channel Part 3)', () => {
  beforeEach(() => {
    state.updates = [];
    state.sendEmailCalls = [];
    state.emailConfig = null;
    state.existingMessageMeta = { client_message_uuid: 'uuid-1', transcript: null };
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.leadsmind.io';
  });

  it('renders two waveform blocks linking to the hosted playback page with distinct top/bottom positions', async () => {
    await sendVoiceNoteEmail({
      workspaceId: 'ws-1',
      messageId: 'msg-1',
      toEmail: 'lead@example.com',
      sender: { full_name: 'Jane Doe' },
      audioUrl: 'https://cdn.example.com/note.webm',
      audioDuration: 42,
      message: 'Hi there, following up on your enquiry.',
    });

    const html = state.sendEmailCalls[0].html as string;
    expect(html).toContain('/voice-note/');
    expect(html).toContain('pos=top');
    expect(html).toContain('pos=bottom');
    // Both blocks point at the SAME token (one token per send).
    const tokenMatches = [...html.matchAll(/\/voice-note\/([0-9a-f-]{36})\?pos=(top|bottom)/g)];
    expect(tokenMatches).toHaveLength(2);
    expect(tokenMatches[0][1]).toBe(tokenMatches[1][1]);
  });

  it('renders the real transcript as genuine body text, not an italic caption', async () => {
    await sendVoiceNoteEmail({
      workspaceId: 'ws-1',
      messageId: 'msg-1',
      toEmail: 'lead@example.com',
      sender: { full_name: 'Jane Doe' },
      audioUrl: 'https://cdn.example.com/note.webm',
      message: 'A real transcript line.',
    });
    const html = state.sendEmailCalls[0].html as string;
    expect(html).toContain('A real transcript line.');
    expect(html).not.toContain('font-style: italic');
  });

  it('escapes transcript HTML to avoid breaking the table layout', async () => {
    await sendVoiceNoteEmail({
      workspaceId: 'ws-1',
      messageId: 'msg-1',
      toEmail: 'lead@example.com',
      sender: { full_name: 'Jane Doe' },
      audioUrl: 'https://cdn.example.com/note.webm',
      message: '<b>bold</b> & "quoted"',
    });
    const html = state.sendEmailCalls[0].html as string;
    expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
    expect(html).not.toContain('<b>bold</b>');
  });

  it('persists the playback token onto the real message row, merging (not overwriting) existing metadata', async () => {
    await sendVoiceNoteEmail({
      workspaceId: 'ws-1',
      messageId: 'msg-1',
      toEmail: 'lead@example.com',
      sender: { full_name: 'Jane Doe' },
      audioUrl: 'https://cdn.example.com/note.webm',
    });

    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].voice_playback_token).toMatch(/^[0-9a-f-]{36}$/);
    expect(state.updates[0].metadata.client_message_uuid).toBe('uuid-1'); // preserved
    expect(state.updates[0].metadata.voice_playback_snapshot).toMatchObject({ sender_name: 'Jane Doe', workspace_name: 'World Teachers Academy' });
  });

  it('sets a Reply-To header when provided (Email Channel Part 1 wiring)', async () => {
    await sendVoiceNoteEmail({
      workspaceId: 'ws-1',
      messageId: 'msg-1',
      toEmail: 'lead@example.com',
      sender: { full_name: 'Jane Doe' },
      audioUrl: 'https://cdn.example.com/note.webm',
      replyTo: 'world-teachers-academy@inbox.leadsmind.io',
    });
    expect(state.sendEmailCalls[0].config.headers['Reply-To']).toBe('world-teachers-academy@inbox.leadsmind.io');
  });
});
