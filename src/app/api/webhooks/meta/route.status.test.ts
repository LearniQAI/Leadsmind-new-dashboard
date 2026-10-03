import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { makeFakeDb, type FakeDb } from '@/test/fakeSupabase';

const h = vi.hoisted(() => ({ db: null as any }));
process.env.META_APP_SECRET = 'status-test-secret';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';

vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: (t: string) => h.db.from(t) }) }));
vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/encryption', () => ({ decrypt: (s: string) => s }));
vi.mock('@/lib/meta/MetaAdapter', () => ({ MetaAdapter: class {} }));
vi.mock('@/lib/smsOptOut', () => ({ recordSmsOptOut: vi.fn(), clearSmsOptOut: vi.fn() }));
vi.mock('@/lib/automation/cancelOptOutExecutions', () => ({ cancelSmsExecutionsForContacts: vi.fn() }));

import { POST } from './route';

const sign = (body: string) => 'sha256=' + crypto.createHmac('sha256', process.env.META_APP_SECRET!).update(body, 'utf8').digest('hex');
async function post(payload: any) {
  const body = JSON.stringify(payload);
  const res = await POST(new Request('https://app.test/api/webhooks/meta', { method: 'POST', headers: { 'x-hub-signature-256': sign(body), 'content-type': 'application/json' }, body }));
  return res.status;
}
const waStatus = (phoneNumberId: string, wamid: string, status: string) => ({
  object: 'whatsapp_business_account',
  entry: [{ id: 'waba', changes: [{ field: 'messages', value: { metadata: { phone_number_id: phoneNumberId }, statuses: [{ id: wamid, status, recipient_id: '1555' }] } }] }],
});

let db: FakeDb;
const msg = (id: string) => db.tables.messages.find((m) => m.id === id)!;

beforeEach(() => {
  db = makeFakeDb({
    platform_connections: [
      { id: 'c1', workspace_id: 'wsA', platform: 'whatsapp', credentials: { phone_number_id: 'pnA' } },
      { id: 'c2', workspace_id: 'wsB', platform: 'whatsapp', credentials: { phone_number_id: 'pnB' } },
      { id: 'c3', workspace_id: 'wsA', platform: 'facebook', credentials: { page_id: 'pageA' } },
      { id: 'c4', workspace_id: 'wsB', platform: 'facebook', credentials: { page_id: 'pageB' } },
    ],
    messages: [
      { id: 'mA', workspace_id: 'wsA', conversation_id: 'cvA', external_id: 'wamid.A', status: 'sent', direction: 'outbound' },
      { id: 'mB', workspace_id: 'wsB', conversation_id: 'cvB', external_id: 'wamid.B', status: 'sent', direction: 'outbound' },
      { id: 'fA', workspace_id: 'wsA', conversation_id: 'cvA', external_id: 'mid.A', status: 'sent', direction: 'outbound' },
    ],
    conversations: [{ id: 'cvA', workspace_id: 'wsA', platform: 'facebook', external_thread_id: 'psid1' }],
  });
  h.db = db;
});

describe('WhatsApp status receipts are scoped to the workspace that owns the phone_number_id', () => {
  it("a status for another workspace's wamid, delivered on B's number, changes nothing", async () => {
    expect(await post(waStatus('pnB', 'wamid.A', 'delivered'))).toBe(200);
    expect(msg('mA').status).toBe('sent');
    expect(msg('mB').status).toBe('sent');
    expect(db.writes.filter((w) => w.table === 'messages' && w.op === 'update')[0]?.rows.count).toBe(0);
  });

  it("the owning workspace's number updates its own message", async () => {
    expect(await post(waStatus('pnA', 'wamid.A', 'delivered'))).toBe(200);
    expect(msg('mA').status).toBe('delivered');
    expect(msg('mB').status).toBe('sent');
  });

  it('failed receipts are scoped too', async () => {
    await post(waStatus('pnB', 'wamid.A', 'failed'));
    expect(msg('mA').status).toBe('sent');
  });

  it('an unknown phone_number_id applies nothing (no bare external_id match)', async () => {
    expect(await post(waStatus('pn-unknown', 'wamid.A', 'delivered'))).toBe(200);
    expect(msg('mA').status).toBe('sent');
    expect(db.writes.filter((w) => w.table === 'messages')).toHaveLength(0);
  });

  it('a missing phone_number_id applies nothing', async () => {
    const p: any = waStatus('x', 'wamid.A', 'delivered');
    delete p.entry[0].changes[0].value.metadata;
    expect(await post(p)).toBe(200);
    expect(msg('mA').status).toBe('sent');
  });

  it('a connection lookup error fails the request so Meta retries (nothing applied)', async () => {
    db.failTables.add('platform_connections');
    expect(await post(waStatus('pnA', 'wamid.A', 'delivered'))).toBe(500);
    expect(msg('mA').status).toBe('sent');
  });
});

describe('Facebook delivery receipts are scoped by the page that owns the entry', () => {
  const fbDelivery = (pageId: string, mid: string) => ({ object: 'page', entry: [{ id: pageId, messaging: [{ sender: { id: 'psid1' }, recipient: { id: pageId }, delivery: { mids: [mid] } }] }] });

  it("another workspace's page cannot mark A's message delivered", async () => {
    await post(fbDelivery('pageB', 'mid.A'));
    expect(msg('fA').status).toBe('sent');
  });

  it("the owning page does", async () => {
    await post(fbDelivery('pageA', 'mid.A'));
    expect(msg('fA').status).toBe('delivered');
  });
});
