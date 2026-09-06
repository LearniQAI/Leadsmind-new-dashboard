/**
 * Optimistic outbound-message rendering for the Communications Hub — shared by
 * every channel (WhatsApp, Instagram, Email, SMS, Messenger).
 *
 * Before this, `ConversationsClient.handleSend` awaited the ENTIRE `sendMessage`
 * server action — which includes the real provider call (Graph API POST with a
 * 10s timeout for Meta channels; Resend for Email; the Resend→Twilio bridge for
 * SMS) — and only then called `router.refresh()` to refetch. The sent bubble
 * didn't appear until that whole round trip finished (~3-4s). No channel had an
 * optimistic path; Message Delivery Reliability Part 3's "targeted realtime
 * patch" only replaced the blunt refresh for message *UPDATE*s (status
 * transitions on an already-visible bubble), never for the initial INSERT.
 *
 * The fix: append a local 'sending' bubble synchronously on submit, keyed by the
 * `client_message_uuid` that `MessageInput` already generates for every channel,
 * then reconcile it against the server row (matched on that same uuid, which is
 * stored in `messages.metadata.client_message_uuid` and returned by
 * `getConversations()`), dropping the optimistic twin once the real row lands so
 * there's never a duplicate.
 */

export interface OptimisticMessage {
  clientMessageUuid: string;
  /** The raw conversations.id the send targeted (matches availablePlatforms[].conversationId). */
  conversationId: string;
  platform: string;
  content: string;
  audioUrl?: string;
  sentAt: string;
}

export function buildOptimisticBubble(o: OptimisticMessage) {
  return {
    id: `optimistic:${o.clientMessageUuid}`,
    direction: 'outbound' as const,
    content: o.content,
    audio_url: o.audioUrl || null,
    status: 'sending' as const,
    sent_at: o.sentAt,
    metadata: { client_message_uuid: o.clientMessageUuid },
    platform: o.platform,
    conversationId: o.conversationId,
    __optimistic: true as const,
  };
}

/** Every `client_message_uuid` already present on a real (server) message row. */
export function collectRealClientUuids(consolidated: Array<{ messages?: any[] }>): Set<string> {
  const s = new Set<string>();
  for (const c of consolidated) {
    for (const m of c.messages || []) {
      const u = m?.metadata?.client_message_uuid;
      if (typeof u === 'string' && u) s.add(u);
    }
  }
  return s;
}

/**
 * Injects still-pending optimistic messages into their matching consolidated
 * conversation, skipping any whose real row has already arrived (dedup). Mutates
 * the passed consolidated entries' `.messages` / `.last_message_at` — safe
 * because those objects are freshly rebuilt on every memo run, never the props.
 */
export function mergeOptimisticIntoConsolidated(consolidated: any[], optimistic: OptimisticMessage[]): void {
  if (!optimistic.length) return;
  const realUuids = collectRealClientUuids(consolidated);

  for (const conv of consolidated) {
    const rawIds = new Set<string>((conv.availablePlatforms || []).map((p: any) => p.conversationId));
    const pending = optimistic.filter((o) => rawIds.has(o.conversationId) && !realUuids.has(o.clientMessageUuid));
    if (!pending.length) continue;

    conv.messages.push(...pending.map(buildOptimisticBubble));
    const newest = pending.reduce(
      (acc, o) => (new Date(o.sentAt).getTime() > new Date(acc).getTime() ? o.sentAt : acc),
      conv.last_message_at || pending[0].sentAt,
    );
    conv.last_message_at = newest;
  }
}

/**
 * Which optimistic messages are still worth keeping in state: not yet reconciled
 * server-side, and not older than `ttlMs` (a safety net — `sendMessage` inserts
 * the real row before any provider call, so a reconcile should always happen,
 * but a totally stuck send shouldn't leave a 'sending' bubble forever).
 */
export function pruneOptimistic(
  optimistic: OptimisticMessage[],
  realClientUuids: Set<string>,
  now: number = Date.now(),
  ttlMs: number = 120_000,
): OptimisticMessage[] {
  return optimistic.filter(
    (o) => !realClientUuids.has(o.clientMessageUuid) && now - new Date(o.sentAt).getTime() < ttlMs,
  );
}
