import { describe, it, expect } from 'vitest';
import {
  buildOptimisticBubble,
  collectRealClientUuids,
  mergeOptimisticIntoConsolidated,
  pruneOptimistic,
  type OptimisticMessage,
} from './optimisticMessages';

const opt = (over: Partial<OptimisticMessage> = {}): OptimisticMessage => ({
  clientMessageUuid: 'uuid-1',
  conversationId: 'conv-1',
  platform: 'whatsapp',
  content: 'hello',
  sentAt: '2026-09-06T10:00:00.000Z',
  ...over,
});

describe('buildOptimisticBubble', () => {
  it('produces a sending outbound bubble carrying the uuid for reconciliation', () => {
    const b = buildOptimisticBubble(opt({ content: 'hey' }));
    expect(b).toMatchObject({
      id: 'optimistic:uuid-1',
      direction: 'outbound',
      status: 'sending',
      content: 'hey',
      metadata: { client_message_uuid: 'uuid-1' },
      __optimistic: true,
    });
  });
});

describe('collectRealClientUuids', () => {
  it('gathers every client_message_uuid from server message rows', () => {
    const s = collectRealClientUuids([
      { messages: [{ metadata: { client_message_uuid: 'a' } }, { metadata: {} }] },
      { messages: [{ metadata: { client_message_uuid: 'b' } }] },
      { messages: [] },
      {},
    ] as any);
    expect([...s].sort()).toEqual(['a', 'b']);
  });
});

describe('mergeOptimisticIntoConsolidated', () => {
  const makeConv = (rawId: string, messages: any[] = []) => ({
    id: `contact:x`,
    availablePlatforms: [{ platform: 'whatsapp', conversationId: rawId }],
    messages,
    last_message_at: '2026-09-06T09:00:00.000Z',
  });

  it('appends a pending optimistic bubble to the matching conversation and bumps last_message_at', () => {
    const conv = makeConv('conv-1');
    mergeOptimisticIntoConsolidated([conv], [opt()]);
    expect(conv.messages).toHaveLength(1);
    expect(conv.messages[0].__optimistic).toBe(true);
    expect(conv.last_message_at).toBe('2026-09-06T10:00:00.000Z');
  });

  it('does NOT append when the real server row (same uuid) already exists — no duplicate', () => {
    const conv = makeConv('conv-1', [{ id: 'real-1', metadata: { client_message_uuid: 'uuid-1' }, status: 'sent' }]);
    mergeOptimisticIntoConsolidated([conv], [opt({ clientMessageUuid: 'uuid-1' })]);
    expect(conv.messages).toHaveLength(1);
    expect(conv.messages[0].id).toBe('real-1');
  });

  it('only injects into the conversation the send actually targeted', () => {
    const a = makeConv('conv-1');
    const b = makeConv('conv-2');
    mergeOptimisticIntoConsolidated([a, b], [opt({ conversationId: 'conv-2' })]);
    expect(a.messages).toHaveLength(0);
    expect(b.messages).toHaveLength(1);
  });

  it('is a no-op with no optimistic messages', () => {
    const conv = makeConv('conv-1', [{ id: 'real-1', metadata: {} }]);
    mergeOptimisticIntoConsolidated([conv], []);
    expect(conv.messages).toHaveLength(1);
  });
});

describe('pruneOptimistic', () => {
  it('drops entries whose real row has arrived', () => {
    const kept = pruneOptimistic([opt({ clientMessageUuid: 'a' }), opt({ clientMessageUuid: 'b' })], new Set(['a']));
    expect(kept.map((o) => o.clientMessageUuid)).toEqual(['b']);
  });

  it('drops entries older than the TTL even if unreconciled (stuck-send safety net)', () => {
    const now = Date.parse('2026-09-06T10:05:00.000Z');
    const kept = pruneOptimistic(
      [opt({ clientMessageUuid: 'stale', sentAt: '2026-09-06T10:00:00.000Z' })], // 5 min old
      new Set(),
      now,
    );
    expect(kept).toHaveLength(0);
  });

  it('keeps a recent, unreconciled entry', () => {
    const now = Date.parse('2026-09-06T10:00:03.000Z');
    const kept = pruneOptimistic([opt({ clientMessageUuid: 'fresh' })], new Set(), now);
    expect(kept).toHaveLength(1);
  });
});
