import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// inboundEmailProcessing.ts constructs a Supabase admin client at module load
// time (matching the existing cron-worker convention) — stub it out so this
// test only exercises the pure body-resolution logic, no real network/DB.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: () => ({ insert: async () => ({ error: null }) }) }),
}));

import { resolveInboundEmailContent } from './inboundEmailProcessing';

describe('resolveInboundEmailContent — shared by the Email->SMS bridge and the new email-channel path', () => {
  const realFetch = global.fetch;
  beforeEach(() => { global.fetch = vi.fn() as any; });
  afterEach(() => { global.fetch = realFetch; vi.restoreAllMocks(); });

  it('prefers the Resend receiving-API text body over the webhook payload fields', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'Hello from the receiving API', html: '<p>ignored</p>' }),
    });

    const { bodyText, rawText } = await resolveInboundEmailContent({
      email_id: 'em_123',
      subject: 'Quick question',
      text: 'ignored webhook text',
    });

    expect(bodyText).toBe('Hello from the receiving API');
    expect(rawText).toBe('Subj: Quick question\n\nHello from the receiving API');
  });

  it('falls back to the webhook payload text when the receiving API has no email_id / fails', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 404 });

    const { rawText } = await resolveInboundEmailContent({ subject: 'Hi', text: 'Plain text body' });
    expect(rawText).toBe('Subj: Hi\n\nPlain text body');
  });

  it('falls back to stripped HTML when there is no plain text anywhere', async () => {
    const { bodyText } = await resolveInboundEmailContent({ html: '<p>Hello <b>world</b></p>' });
    expect(bodyText).toBe('Hello world');
  });

  it('strips Gmail-style quoted replies', async () => {
    const { bodyText } = await resolveInboundEmailContent({
      text: 'My actual reply.\n\nOn Mon, Sep 1, 2026 at 10:00 AM Jane wrote:\n> original message',
    });
    expect(bodyText).toBe('My actual reply.');
  });

  it('strips Outlook-style quoted headers', async () => {
    const { bodyText } = await resolveInboundEmailContent({
      text: 'My reply text\n\nFrom: sender@x.com\nSent: Monday\nTo: me@x.com\nSubject: Re: Hi',
    });
    expect(bodyText).toBe('My reply text');
  });

  it('produces an empty rawText when there is truly nothing to show', async () => {
    const { rawText } = await resolveInboundEmailContent({});
    expect(rawText).toBe('');
  });

  it('subject-only email (no body) still produces a rawText', async () => {
    const { rawText } = await resolveInboundEmailContent({ subject: 'No body here' });
    expect(rawText).toBe('Subj: No body here');
  });
});
