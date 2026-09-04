import { describe, expect, it, beforeEach, vi } from 'vitest';

// --- Mocks (hoisted so the factory can see the holders) ----------------------
const sendState = vi.hoisted(() => ({
  result: { success: true, externalId: 'mid.default' } as any,
  calls: 0,
}));
const adminHolder = vi.hoisted(() => ({ client: null as any }));

vi.mock('@/lib/meta/MetaAdapter', () => {
  class MetaAdapter {
    constructor(_c: any, _o?: any) {}
    async sendInstagram() { sendState.calls++; return sendState.result; }
    async sendFacebook() { sendState.calls++; return sendState.result; }
    async sendWhatsApp() { sendState.calls++; return sendState.result; }
  }
  return { MetaAdapter };
});

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => adminHolder.client,
}));

import { dispatchOutboundMessage } from './dispatchOutboundMessage';
import { MESSAGE_SEND_MAX_ATTEMPTS } from './retryConfig';

// --- Recording fake supabase client ---------------------------------------
function recorder() {
  const writes: any[] = [];
  function chain(table: string, op: string, payload: any) {
    const rec: any = { table, op, payload, filters: [] };
    const proxy: any = {
      eq: (c: string, v: any) => { rec.filters.push(['eq', c, v]); return proxy; },
      in: (c: string, v: any) => { rec.filters.push(['in', c, v]); return proxy; },
      not: (c: string, o: string, v: any) => { rec.filters.push(['not', c, o, v]); return proxy; },
      select: () => proxy,
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: any, reject: any) => {
        writes.push(rec);
        return Promise.resolve({ data: null, error: null }).then(resolve, reject);
      },
    };
    return proxy;
  }
  const client = {
    from: (table: string) => ({
      update: (payload: any) => chain(table, 'update', payload),
      insert: (payload: any) => chain(table, 'insert', payload),
      upsert: (payload: any, opts: any) => chain(table, 'upsert', { payload, opts }),
    }),
  };
  return { client, writes };
}

const baseMessage = {
  id: 'msg-1',
  workspace_id: 'ws-1',
  conversation_id: 'conv-1',
  content: 'hello there',
  external_id: null,
  metadata: { client_message_uuid: 'uuid-1', transcript: null },
};

let msgRec: ReturnType<typeof recorder>;
let adminRec: ReturnType<typeof recorder>;

beforeEach(() => {
  sendState.result = { success: true, externalId: 'mid.default' };
  sendState.calls = 0;
  msgRec = recorder();
  adminRec = recorder();
  adminHolder.client = adminRec.client;
});

const run = (over: Partial<Parameters<typeof dispatchOutboundMessage>[1]> = {}) =>
  dispatchOutboundMessage(
    { messagesClient: msgRec.client },
    { message: { ...baseMessage }, platform: 'instagram', recipient: 'igsid-1', credentials: {}, attemptNumber: 1, context: 'inline', ...over },
  );

const wrote = (rec: ReturnType<typeof recorder>, table: string, op: string) =>
  rec.writes.filter((w) => w.table === table && w.op === op);

describe('dispatchOutboundMessage — state machine', () => {
  it('success → message set to sent + queue row marked done', async () => {
    sendState.result = { success: true, externalId: 'mid.OK' };
    const out = await run();
    expect(out).toEqual({ outcome: 'sent', externalId: 'mid.OK' });
    expect(wrote(msgRec, 'messages', 'update')[0].payload).toMatchObject({ status: 'sent', external_id: 'mid.OK' });
    expect(wrote(adminRec, 'message_dispatch_queue', 'update')[0].payload).toMatchObject({ status: 'done' });
    expect(wrote(adminRec, 'webhook_dead_letters', 'insert')).toHaveLength(0);
  });

  it('recoverable failure on attempt 1 → message set to retrying + queue row upserted, NO dead letter', async () => {
    sendState.result = { success: false, error: 'rate limited', httpStatus: 429 };
    const out = await run({ attemptNumber: 1, context: 'inline' });
    expect(out.outcome).toBe('retrying');
    expect(wrote(msgRec, 'messages', 'update')[0].payload).toMatchObject({ status: 'retrying' });
    const upsert = wrote(adminRec, 'message_dispatch_queue', 'upsert')[0];
    expect(upsert.payload.payload).toMatchObject({ status: 'pending', attempt_count: 1, failure_class: 'recoverable' });
    expect(upsert.payload.opts).toMatchObject({ onConflict: 'message_id' });
    expect(wrote(adminRec, 'webhook_dead_letters', 'insert')).toHaveLength(0);
  });

  it('permanent failure → message FAILED now + dead-letter row, no retry scheduled', async () => {
    sendState.result = { success: false, error: 'Invalid OAuth access token.', errorCode: 190, errorType: 'OAuthException', httpStatus: 401 };
    const out = await run({ attemptNumber: 1, context: 'inline' });
    expect(out).toMatchObject({ outcome: 'failed', failureClass: 'permanent' });
    expect(wrote(msgRec, 'messages', 'update')[0].payload).toMatchObject({ status: 'failed' });
    expect(wrote(msgRec, 'messages', 'update')[0].payload.metadata).toMatchObject({ error_code: 190, error_message: 'Invalid OAuth access token.' });
    const dl = wrote(adminRec, 'webhook_dead_letters', 'insert')[0];
    expect(dl.payload.provider).toBe('message_send');
    expect(dl.payload.error_type).toBe('meta_send_permanent_190');
    expect(wrote(adminRec, 'message_dispatch_queue', 'upsert')).toHaveLength(0);
  });

  it('recoverable failure but attempts exhausted → FAILED + retries-exhausted dead letter', async () => {
    sendState.result = { success: false, error: 'still rate limited', httpStatus: 429 };
    const out = await run({ attemptNumber: MESSAGE_SEND_MAX_ATTEMPTS, context: 'worker' });
    expect(out).toMatchObject({ outcome: 'failed', failureClass: 'exhausted' });
    const dl = wrote(adminRec, 'webhook_dead_letters', 'insert')[0];
    expect(dl.payload.error_type).toBe('meta_send_retries_exhausted');
    expect(wrote(adminRec, 'message_dispatch_queue', 'update')[0].payload).toMatchObject({ status: 'failed' });
  });

  it('worker retry (not exhausted) → queue row UPDATE (not upsert) with the new attempt count', async () => {
    sendState.result = { success: false, error: '5xx', httpStatus: 503 };
    const out = await run({ attemptNumber: 2, context: 'worker' });
    expect(out.outcome).toBe('retrying');
    const upd = wrote(adminRec, 'message_dispatch_queue', 'update').find((w) => w.payload.attempt_count === 2);
    expect(upd).toBeTruthy();
    expect(upd.payload).toMatchObject({ status: 'pending', failure_class: 'recoverable' });
  });

  it('external_id already present → treated as sent, provider is NOT called again (idempotency)', async () => {
    const out = await dispatchOutboundMessage(
      { messagesClient: msgRec.client },
      { message: { ...baseMessage, external_id: 'mid.ALREADY' }, platform: 'instagram', recipient: 'x', credentials: {}, attemptNumber: 3, context: 'worker' },
    );
    expect(out).toEqual({ outcome: 'sent', externalId: 'mid.ALREADY' });
    expect(sendState.calls).toBe(0);
  });
});
