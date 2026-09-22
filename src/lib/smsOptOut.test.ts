import { describe, it, expect } from 'vitest';
import { getSmsOptOutReason, recordSmsOptOut, clearSmsOptOut, SmsOptedOutError } from '@/lib/smsOptOut';

// Chainable fake supabase recording every call, with per-table canned results.
function fakeDb(tables: Record<string, { rows?: any[]; error?: any }> = {}) {
  const calls: { table: string; op: string; args: any[] }[] = [];
  return {
    calls,
    from(table: string) {
      const rec = (op: string) => (...args: any[]) => { calls.push({ table, op, args }); return q; };
      const t = tables[table] ?? {};
      const q: any = {
        select: rec('select'), eq: rec('eq'), in: rec('in'), or: rec('or'), limit: rec('limit'),
        upsert: rec('upsert'), update: rec('update'), delete: rec('delete'),
        then: (r: any) => r({ data: t.rows ?? [], error: t.error ?? null }),
      };
      return q;
    },
  } as any;
}

describe('getSmsOptOutReason', () => {
  it('is blocked by the durable list, or by a contact flag, matched on the normalised number', async () => {
    const listed = fakeDb({ sms_suppression_list: { rows: [{ id: 1 }] } });
    expect(await getSmsOptOutReason(listed, 'w1', '082 123 4567')).toBe('suppression_list');
    expect(listed.calls.find((c: any) => c.table === 'sms_suppression_list' && c.op === 'eq' && c.args[0] === 'phone_e164')!.args[1]).toBe('+27821234567');

    const flagged = fakeDb({ contacts: { rows: [{ id: 'c' }] } });
    expect(await getSmsOptOutReason(flagged, 'w1', '+27821234567')).toBe('contact_flag');
  });

  it('is scoped to the workspace and allows a clean number', async () => {
    const db = fakeDb();
    expect(await getSmsOptOutReason(db, 'w1', '+27821234567')).toBeNull();
    for (const t of ['sms_suppression_list', 'contacts']) {
      expect(db.calls.some((c: any) => c.table === t && c.op === 'eq' && c.args[0] === 'workspace_id' && c.args[1] === 'w1')).toBe(true);
    }
  });

  it('a number it cannot identify has nothing to match; a lookup error fails CLOSED', async () => {
    expect(await getSmsOptOutReason(fakeDb(), 'w1', 'not a phone')).toBeNull();
    await expect(getSmsOptOutReason(fakeDb({ sms_suppression_list: { error: { message: 'boom' } } }), 'w1', '+27821234567')).rejects.toThrow('opt-out lookup failed');
  });
});

describe('recordSmsOptOut / clearSmsOptOut', () => {
  it('records durably in the workspace AND flags its matching contacts', async () => {
    const db = fakeDb({ contacts: { rows: [{ id: 'c1' }, { id: 'c2' }] } });
    const r = await recordSmsOptOut(db, { workspaceId: 'w1', phone: '0821234567', source: 'twilio_inbound', messageSid: 'SM1' });
    expect(r).toEqual({ e164: '+27821234567', contactIds: ['c1', 'c2'] });
    const up = db.calls.find((c: any) => c.table === 'sms_suppression_list' && c.op === 'upsert')!;
    expect(up.args[0]).toMatchObject({ workspace_id: 'w1', phone_e164: '+27821234567', source: 'twilio_inbound', message_sid: 'SM1' });
    expect(db.calls.some((c: any) => c.table === 'contacts' && c.op === 'update' && c.args[0].sms_opt_out === true && c.args[0].opted_out === true)).toBe(true);
  });

  it('a STOP from a non-contact is still recorded; a platform-level STOP has no list row but flags every match', async () => {
    const none = fakeDb();
    expect((await recordSmsOptOut(none, { workspaceId: 'w1', phone: '+27829999999', source: 's' })).contactIds).toEqual([]);
    expect(none.calls.some((c: any) => c.table === 'sms_suppression_list' && c.op === 'upsert')).toBe(true);

    const platform = fakeDb({ contacts: { rows: [{ id: 'a' }, { id: 'b' }] } });
    await recordSmsOptOut(platform, { workspaceId: null, phone: '+27821234567', source: 's' });
    expect(platform.calls.some((c: any) => c.table === 'sms_suppression_list')).toBe(false);
    expect(platform.calls.some((c: any) => c.table === 'contacts' && c.op === 'eq' && c.args[0] === 'workspace_id')).toBe(false);
  });

  it('an unparseable number records nothing', async () => {
    const db = fakeDb();
    expect(await recordSmsOptOut(db, { workspaceId: 'w1', phone: 'xx', source: 's' })).toEqual({ e164: null, contactIds: [] });
    expect(db.calls.length).toBe(0);
  });

  it('START clears the list row and flags only inside the given workspace', async () => {
    const db = fakeDb({ contacts: { rows: [{ id: 'c1' }] } });
    await clearSmsOptOut(db, { workspaceId: 'w1', phone: '+27821234567' });
    expect(db.calls.some((c: any) => c.table === 'sms_suppression_list' && c.op === 'delete')).toBe(true);
    expect(db.calls.some((c: any) => c.table === 'contacts' && c.op === 'update' && c.args[0].sms_opt_out === false)).toBe(true);
  });
});

describe('SmsOptedOutError', () => {
  it('is user-safe and carries the reason', () => {
    const e = new SmsOptedOutError('suppression_list');
    expect(e.userSafe).toBe(true);
    expect(e.reason).toBe('suppression_list');
    expect(e).toBeInstanceOf(Error);
  });
});
