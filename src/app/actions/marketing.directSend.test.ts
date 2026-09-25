import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendEmail = vi.fn();
const getCfg = vi.fn();
const claim = vi.fn();
const logErr = vi.fn();
const state: { updates: any[]; suppression: any[]; campaignFrom: string | null; authEmail: string; segment: any } = { updates: [], suppression: [], campaignFrom: null, authEmail: 'me@example.com', segment: null };

function makeDb() {
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: state.authEmail } } }) },
    from(table: string) {
      let op = 'select';
      const res = () => {
        if (table === 'email_campaigns' && op === 'select') return { data: { from_email: state.campaignFrom, workspace_id: 'w1', status: 'draft', scheduled_for: null, subject: 's', from_name: 'F' }, error: null };
        if (table === 'email_campaigns' && op === 'update') return { data: { id: 'c1', workspace_id: 'w1', subject: 's', from_name: 'F', from_email: state.campaignFrom }, error: null };
        if (table === 'segments') return { data: state.segment, error: null };
        if (table === 'sender_domains') return { data: { spf_status: true, dkim_status: true }, error: null };
        if (table === 'global_suppression_list') return { data: state.suppression, error: null };
        return { data: [], error: null };
      };
      const q: any = {
        select: () => q, ilike: () => q, eq: () => q, in: () => q, order: () => q, range: () => q, contains: () => q,
        update: (p: any) => { op = 'update'; state.updates.push({ table, p }); return q; },
        single: () => Promise.resolve(res()), maybeSingle: () => Promise.resolve(res()),
        then: (r: any) => r(res()),
      };
      return q;
    },
  };
}

vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => makeDb(), createAdminClient: () => makeDb() }));
vi.mock('@/lib/auth', () => ({ requireWorkspaceAccess: async () => ({ workspaceId: 'w1' }), requireFormAccess: vi.fn(), requireModuleAccess: async () => {} }));
vi.mock('@/lib/email/resolveConfig', () => ({ getWorkspaceEmailConfig: (...a: any[]) => getCfg(...a) }));
vi.mock('@/lib/email', () => ({ sendEmail: (...a: any[]) => sendEmail(...a) }));
vi.mock('@/lib/campaigns/testSendLimit', () => ({ claimTestSendSlot: (...a: any[]) => claim(...a) }));
vi.mock('@/shared/logger', () => ({ logger: { error: (...a: any[]) => logErr(...a), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/inngest', () => ({ inngest: { send: vi.fn() } }));
vi.mock('@/lib/builder/templates', () => ({ getTemplateById: vi.fn() }));

import { updateCampaign, sendTestEmailAction } from '@/app/actions/marketing';

const base = { status: 'scheduled', scheduled_for: null, body_html: '<a href="{{unsubscribe_link}}">u</a> {{first_name}}', segment: { emails: ['a@x.com'] } };

beforeEach(() => { sendEmail.mockReset(); getCfg.mockReset(); state.updates = []; state.suppression = []; state.campaignFrom = null; state.authEmail = 'me@example.com'; state.segment = null; logErr.mockReset(); claim.mockReset(); claim.mockResolvedValue({ ok: true }); });

describe('updateCampaign direct-address path (B3)', () => {
  it('passes the workspace key and populates unsubscribe link', async () => {
    getCfg.mockResolvedValue({ apiKey: 're_workspace', fromEmail: 'w@acme.com', fromName: 'W' });
    sendEmail.mockResolvedValue({ id: 'm1' });
    const r: any = await updateCampaign('c1', { ...base, segment: { emails: ['a@x.com'] } });
    expect(r.error).toBeUndefined();
    expect(r.directSent).toEqual(['a@x.com']);
    const arg = sendEmail.mock.calls[0][0];
    expect(arg.config.apiKey).toBe('re_workspace');
    expect(arg.config.fromEmail).toBe('w@acme.com'); // provider's From, not a platform address
    expect(arg.html).toContain('/public/unsubscribe?email=a%40x.com');
    expect(arg.html).not.toMatch(/\{\{/);
  });

  it('fails BEFORE mutating anything when the workspace has no provider', async () => {
    getCfg.mockResolvedValue(null);
    const r: any = await updateCampaign('c1', { ...base, segment: { emails: ['a@x.com'] } });
    expect(r.error).toMatch(/Verify a sending domain/);
    expect(state.updates).toEqual([]);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('rolls status back when every direct send fails and nothing else is queued', async () => {
    getCfg.mockResolvedValue({ apiKey: 're_workspace', fromEmail: 'me@acme.com' });
    // A provider rejection is user-safe (EmailSendError sets userSafe) and is shown.
    sendEmail.mockRejectedValue(Object.assign(new Error('The domain is not verified'), { userSafe: true }));
    const r: any = await updateCampaign('c1', { ...base, segment: { emails: ['a@x.com'] } });
    expect(r.error).toMatch(/The domain is not verified.*not scheduled/);
    const last = state.updates[state.updates.length - 1];
    expect(last.p).toEqual({ status: 'draft', scheduled_for: null });
  });

  it('never emails a suppressed direct address', async () => {
    getCfg.mockResolvedValue({ apiKey: 're_workspace', fromEmail: 'me@acme.com' });
    state.suppression = [{ workspace_id: 'w1', email: 'A@X.com' }];
    const r: any = await updateCampaign('c1', { ...base, segment: { emails: ['a@x.com'] } });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(r.directSkipped).toEqual(['a@x.com']);
  });
});

describe('From email (never a platform address)', () => {
  it('rejects an explicitly-set platform From with an actionable error and mutates nothing', async () => {
    getCfg.mockResolvedValue({ apiKey: 're_workspace', fromEmail: 'me@acme.com' });
    const r: any = await updateCampaign('c1', { ...base, from_email: 'hello@leadsmind.io' });
    expect(r.error).toMatch(/verified sending domain/);
    expect(state.updates).toEqual([]);
  });
  it('errors when neither the campaign nor the provider has a usable From', async () => {
    getCfg.mockResolvedValue({ apiKey: 're_workspace', fromEmail: 'onboarding@resend.dev' });
    const r: any = await updateCampaign('c1', { ...base, segment: { emails: ['a@x.com'] } });
    expect(r.error).toMatch(/verified sending domain/);
    expect(state.updates).toEqual([]);
  });
  it('self-heals a legacy stored hello@leadsmind.io by using the provider From', async () => {
    state.campaignFrom = 'hello@leadsmind.io';
    getCfg.mockResolvedValue({ apiKey: 're_workspace', fromEmail: 'me@acme.com' });
    sendEmail.mockResolvedValue({});
    const r: any = await updateCampaign('c1', { ...base, segment: { emails: ['a@x.com'] } });
    expect(r.error).toBeUndefined();
    expect(state.updates[0].p.from_email).toBe('me@acme.com');
  });
  it('refuses to schedule with no Resend account at all', async () => {
    getCfg.mockResolvedValue(null);
    const r: any = await updateCampaign('c1', { status: 'scheduled', segment: { tags: ['x'] } });
    expect(r.error).toMatch(/Verify a sending domain/);
    expect(state.updates).toEqual([]);
  });
  it('test send uses the provider From and rejects a bad recipient', async () => {
    getCfg.mockResolvedValue({ apiKey: 're_workspace', fromEmail: 'me@acme.com' });
    sendEmail.mockResolvedValue({});
    await sendTestEmailAction('c1', 'me@example.com', '<p/>');
    expect(sendEmail.mock.calls[0][0].config.fromEmail).toBe('me@acme.com');
    const bad: any = await sendTestEmailAction('c1', 'not-an-email', '<p/>');
    expect(bad.error).toMatch(/valid email/);
  });
});

describe('sendTestEmailAction (B3)', () => {
  it('sends with the workspace key', async () => {
    getCfg.mockResolvedValue({ apiKey: 're_workspace', fromEmail: 'me@acme.com' });
    sendEmail.mockResolvedValue({});
    const r: any = await sendTestEmailAction('c1', 'me@example.com', '<a href="{{unsubscribe_link}}">u</a>');
    expect(r.success).toBe(true);
    expect(sendEmail.mock.calls[0][0].config.apiKey).toBe('re_workspace');
  });
  it('returns an actionable error with no provider, and does not send', async () => {
    getCfg.mockResolvedValue(null);
    const r: any = await sendTestEmailAction('c1', 'me@example.com', '<p/>');
    expect(r.error).toMatch(/Verify a sending domain/);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('empty targeting (B6)', () => {
  const ok = { apiKey: 're_workspace', fromEmail: 'me@acme.com' };
  it('refuses to schedule with no audience at all, before mutating anything', async () => {
    getCfg.mockResolvedValue(ok);
    const r: any = await updateCampaign('c1', { status: 'scheduled', segment: {} });
    expect(r.error).toMatch(/Choose who this campaign is for/);
    expect(state.updates).toEqual([]);
  });
  it('a tag audience that matches nobody is an error and restores the previous status', async () => {
    getCfg.mockResolvedValue(ok);
    const r: any = await updateCampaign('c1', { status: 'scheduled', segment: { tags: ['vip'] } });
    expect(r.error).toMatch(/No eligible recipients/);
    expect(state.updates[state.updates.length - 1].p).toEqual({ status: 'draft', scheduled_for: null });
  });
  it('an auto-sender may legitimately match nobody yet', async () => {
    getCfg.mockResolvedValue(ok);
    const r: any = await updateCampaign('c1', { status: 'scheduled', segment: { tags: ['vip'], is_automated: true } });
    expect(r.error).toBeUndefined();
    expect(r.matchedContactsCount).toBe(0);
  });
});

describe('test-send hardening', () => {
  const ok = { apiKey: 're_workspace', fromEmail: 'me@acme.com' };
  it('accepts normal addresses containing the letter "s" (regex regression)', async () => {
    getCfg.mockResolvedValue(ok); sendEmail.mockResolvedValue({});
    const r: any = await sendTestEmailAction('c1', 'sales@shop.co', '<p/>');
    expect(r.success).toBe(true);
  });
  it("refuses a suppressed recipient but still allows the signed-in user's own address", async () => {
    getCfg.mockResolvedValue(ok); sendEmail.mockResolvedValue({});
    state.suppression = [{ workspace_id: 'w1', email: 'victim@x.com' }, { workspace_id: 'w1', email: 'me@example.com' }];
    const bad: any = await sendTestEmailAction('c1', 'Victim@x.com', '<p/>');
    expect(bad.error).toMatch(/unsubscribed/);
    expect(sendEmail).not.toHaveBeenCalled();
    const own: any = await sendTestEmailAction('c1', 'me@example.com', '<p/>');
    expect(own.success).toBe(true);
  });
  it('returns the limiter error and sends nothing when over the limit', async () => {
    getCfg.mockResolvedValue(ok);
    claim.mockResolvedValue({ ok: false, error: 'Test email limit reached (10 per hour for this workspace). Try again later.' });
    const r: any = await sendTestEmailAction('c1', 'a@x.com', '<p/>');
    expect(r.error).toMatch(/Test email limit reached/);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('test-send error classification', () => {
  const ok = { apiKey: 're_workspace', fromEmail: 'me@acme.com' };
  it('shows a known provider rejection as-is', async () => {
    getCfg.mockResolvedValue(ok);
    sendEmail.mockRejectedValue(Object.assign(new Error('The to field must be a valid email address'), { userSafe: true }));
    const r: any = await sendTestEmailAction('c1', 'a@x.com', '<p/>');
    expect(r.error).toBe('Test email failed: The to field must be a valid email address');
  });
  it('shows validation failures as-is', async () => {
    getCfg.mockResolvedValue(ok);
    expect(((await sendTestEmailAction('c1', 'not-an-email', '<p/>')) as any).error).toBe('Enter a valid email address.');
  });
  it('hides an unexpected internal error behind a generic message and logs the real one server-side', async () => {
    getCfg.mockResolvedValue(ok);
    const internal = new Error('connect ECONNREFUSED 10.0.0.5:5432 password authentication failed for user "svc_admin"');
    sendEmail.mockRejectedValue(internal);
    const r: any = await sendTestEmailAction('c1', 'a@x.com', '<p/>');
    expect(r.error).toBe('Something went wrong sending the test email. Please try again.');
    expect(JSON.stringify(r)).not.toMatch(/ECONNREFUSED|svc_admin|10.0.0.5/);
    expect(logErr).toHaveBeenCalledWith(expect.objectContaining({ err: internal }), 'send.test.email.action.failed');
  });
  it('an internal failure before sending (e.g. config lookup blowing up) is also generic', async () => {
    getCfg.mockRejectedValue(new Error('relation "workspace_email_providers" does not exist'));
    const r: any = await sendTestEmailAction('c1', 'a@x.com', '<p/>');
    expect(r.error).toBe('Something went wrong sending the test email. Please try again.');
  });
});

describe('direct-send failure reasons (item 7)', () => {
  const ok = { apiKey: 're_workspace', fromEmail: 'me@acme.com' };
  it('masks an internal error in both directFailed reasons and the rollback message, and logs the real one', async () => {
    getCfg.mockResolvedValue(ok);
    const internal = new Error('connect ECONNREFUSED 10.0.0.5:5432 password authentication failed for user "svc_admin"');
    sendEmail.mockRejectedValue(internal);
    const r: any = await updateCampaign('c1', { ...base, segment: { emails: ['a@x.com'] } });
    expect(r.error).toBe('Email could not be sent: an unexpected error occurred. The campaign was not scheduled.');
    expect(JSON.stringify(r)).not.toMatch(/ECONNREFUSED|svc_admin|10\.0\.0\.5/);
    expect(logErr).toHaveBeenCalledWith(expect.objectContaining({ err: internal }), 'update.campaign.direct_send.failed');
  });
  it('partial failure: successes stay, and the failed entry carries only a safe reason', async () => {
    getCfg.mockResolvedValue(ok);
    sendEmail
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('relation "email_events" does not exist'))
      .mockRejectedValueOnce(Object.assign(new Error('The to field must be a valid email address'), { userSafe: true }));
    const r: any = await updateCampaign('c1', { ...base, segment: { emails: ['a@x.com', 'b@x.com', 'c@x.com'] } });
    expect(r.directSent).toEqual(['a@x.com']);
    expect(r.directFailed).toEqual([
      { email: 'b@x.com', reason: 'an unexpected error occurred' },
      { email: 'c@x.com', reason: 'The to field must be a valid email address' },
    ]);
  });
});

describe('segment handling in updateCampaign (items 1-3)', () => {
  const ok = { apiKey: 're_workspace', fromEmail: 'me@acme.com' };
  const future = new Date(Date.now() + 86400000).toISOString();

  it('a DELETED segment fails closed: clear error, nothing mutated (was: silently widened to the tag alone)', async () => {
    getCfg.mockResolvedValue(ok);
    state.segment = null; // maybeSingle -> no such segment
    const r: any = await updateCampaign('c1', { status: 'scheduled', scheduled_for: future, segment: { tags: ['vip'], segmentId: 'gone', combineMode: 'AND' } });
    expect(r.error).toMatch(/no longer exists \(it was deleted\)/);
    expect(state.updates).toEqual([]);
  });

  it('a segment with invalid stored rules fails closed too', async () => {
    getCfg.mockResolvedValue(ok);
    state.segment = { rule_group: { logic: 'AND', rules: [{ field: 'company', operator: 'equals', value: 'x' }] } };
    const r: any = await updateCampaign('c1', { status: 'scheduled', scheduled_for: future, segment: { tags: ['vip'], segmentId: 's1' } });
    expect(r.error).toMatch(/segment selected for this audience is invalid/);
    expect(state.updates).toEqual([]);
  });

  it('ad-hoc rules with a blank value are rejected at SAVE time, even without scheduling (item 3)', async () => {
    const r: any = await updateCampaign('c1', { segment: { ruleGroup: { logic: 'AND', rules: [{ field: 'first_name', operator: 'contains', value: '' }] } } });
    expect(r.error).toMatch(/Enter a value/);
    expect(state.updates).toEqual([]);
  });

  it('ad-hoc rules with an unknown field are rejected at save time (item 2)', async () => {
    const r: any = await updateCampaign('c1', { segment: { ruleGroup: { logic: 'AND', rules: [{ field: 'company', operator: 'equals', value: 'Acme' }] } } });
    expect(r.error).toMatch(/Unknown segment field/);
  });

  it('CONTROL: an existing, valid segment does not trip the new guard', async () => {
    getCfg.mockResolvedValue(ok);
    state.segment = { rule_group: { logic: 'AND', rules: [{ field: 'source', operator: 'equals', value: 'x' }] } };
    const r: any = await updateCampaign('c1', { status: 'scheduled', scheduled_for: future, segment: { segmentId: 's1' } });
    expect(String(r.error ?? '')).not.toMatch(/segment selected for this audience/);
  });
});
