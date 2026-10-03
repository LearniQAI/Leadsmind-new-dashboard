import { describe, expect, it } from 'vitest';
import { resolveScheduledFor, SCHEDULE_INVALID_MESSAGE, SCHEDULE_PAST_MESSAGE } from './schedule';
import { validateBotRule, REGEX_RULES_UNSUPPORTED } from './botRuleValidation';
import { userSafeMessage } from '@/shared/errors/userSafe';
import { summarizeMetaPayload } from '@/lib/meta/payloadSummary';
import { STEP_TYPES, getActionDef } from '@/lib/automation/actionConfigSchema';

describe('schedule validation (item 9)', () => {
  const now = new Date('2026-10-02T12:00:00Z');
  it('empty means send now', () => {
    for (const v of [null, undefined, '', '   ']) expect(resolveScheduledFor(v as any, now)).toEqual({ ok: true, iso: now.toISOString() });
  });
  it('a future date is accepted', () => {
    expect(resolveScheduledFor('2026-10-03T08:00:00Z', now)).toEqual({ ok: true, iso: '2026-10-03T08:00:00.000Z' });
  });
  it('an unparseable date gets a specific message', () => {
    expect(resolveScheduledFor('not-a-date', now)).toEqual({ ok: false, error: SCHEDULE_INVALID_MESSAGE });
  });
  it('a past date gets a specific message', () => {
    expect(resolveScheduledFor('2026-10-01T12:00:00Z', now)).toEqual({ ok: false, error: SCHEDULE_PAST_MESSAGE });
  });
  it('tolerates a form left open for under a minute', () => {
    expect(resolveScheduledFor('2026-10-02T11:59:30Z', now).ok).toBe(true);
    expect(resolveScheduledFor('2026-10-02T11:58:00Z', now).ok).toBe(false);
  });
  it('messages are readable, not the old generic one', () => {
    expect(SCHEDULE_INVALID_MESSAGE).not.toMatch(/Failed to create/);
    expect(SCHEDULE_PAST_MESSAGE).not.toMatch(/Failed to create/);
  });
});

describe('bot rule validation (item 4)', () => {
  const ok = { name: 'r', matchType: 'contains', matchValue: 'price', replyType: 'text', replyText: 'hi' };
  it('accepts contains and exact', () => {
    expect(() => validateBotRule(ok)).not.toThrow();
    expect(() => validateBotRule({ ...ok, matchType: 'exact' })).not.toThrow();
  });
  it('rejects regex rules outright, including a catastrophic one', () => {
    for (const v of ['^(a+)+$', '.*', 'hi']) {
      expect(() => validateBotRule({ ...ok, matchType: 'regex', matchValue: v })).toThrow(REGEX_RULES_UNSUPPORTED);
    }
  });
  it('the rejection is user-safe (shown as-is)', () => {
    let caught: unknown;
    try { validateBotRule({ ...ok, matchType: 'regex' }); } catch (e) { caught = e; }
    expect(userSafeMessage(caught, 'generic')).toBe(REGEX_RULES_UNSUPPORTED);
  });
  it('rejects unknown match types and missing fields', () => {
    expect(() => validateBotRule({ ...ok, matchType: 'fuzzy' })).toThrow();
    expect(() => validateBotRule({ ...ok, name: ' ' })).toThrow('Rule name is required');
    expect(() => validateBotRule({ ...ok, matchValue: '' })).toThrow('Match value is required');
    expect(() => validateBotRule({ ...ok, replyText: '' })).toThrow('Reply text is required');
  });
});

describe('redacted webhook log summary (item 7)', () => {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{ id: '109999', changes: [{ field: 'messages', value: {
      metadata: { phone_number_id: '105', display_phone_number: '27821234567' },
      contacts: [{ wa_id: '27825550101', profile: { name: 'Jane Customer' } }],
      messages: [{ from: '27825550101', id: 'wamid.A', type: 'text', text: { body: 'my secret message text' } }],
      statuses: [{ id: 'wamid.B', status: 'delivered', recipient_id: '27825550101' }],
    } }] }],
  };
  it('keeps type, ids and counts', () => {
    expect(summarizeMetaPayload(payload)).toEqual({ object: 'whatsapp_business_account', entryIds: ['109999'], entries: 1, messaging: 0, changes: 1, fields: ['messages'], messages: 1, statuses: 1 });
  });
  it('contains no phone number, name or message text', () => {
    const s = JSON.stringify(summarizeMetaPayload(payload));
    for (const secret of ['27825550101', '27821234567', 'Jane', 'secret message', 'wamid']) expect(s).not.toContain(secret);
  });
  it('is safe on garbage', () => {
    expect(summarizeMetaPayload(null)).toMatchObject({ object: null, entries: 0 });
    expect(summarizeMetaPayload({ entry: 'x' })).toMatchObject({ entries: 0 });
  });
});

describe('send_whatsapp_template stub (item 5)', () => {
  it('is hidden from the step picker but still resolvable for existing steps', () => {
    const def = getActionDef('send_whatsapp_template');
    expect(def?.hidden).toBe(true);
    expect(STEP_TYPES.filter((a) => !a.hidden).map((a) => a.value)).not.toContain('send_whatsapp_template');
    expect(STEP_TYPES.filter((a) => !a.hidden).map((a) => a.value)).toContain('send_whatsapp');
  });
});
