/**
 * Which messaging channels expose a REAL delivery-confirmation signal, and what
 * the terminal "positive" status is for each.
 *
 * Confirmed against Meta's current docs during the Message Delivery Reliability
 * audit (docs/message-delivery-reliability-audit.md):
 *
 *  - Facebook Messenger — emits `message_deliveries` (a real DELIVERED event) and
 *    `message_reads`. Full state machine: sending -> sent -> delivered -> read.
 *  - WhatsApp Cloud API — webhook `statuses[].status` carries real
 *    'sent' | 'delivered' | 'read' | 'failed' (with error codes). Same full machine.
 *  - Instagram Messaging — NO delivery webhook exists. The Instagram Messenger
 *    Platform webhook supports only: messages, messaging_postbacks, messaging_seen,
 *    message_reactions, messaging_referral, standby. There is no `message_deliveries`.
 *    An Instagram outbound message therefore moves sending -> sent -> read and must
 *    NEVER be shown or stored as 'delivered'.
 *
 * This distinction can't be a DB CHECK constraint (it would need to join
 * conversations.platform), so it's enforced here + in the Meta webhook handler +
 * in the message-status UI.
 */

/** Channels whose provider webhook emits a real DELIVERED confirmation. */
export const CHANNELS_WITH_DELIVERY_RECEIPT: ReadonlySet<string> = new Set([
  'facebook',
  'whatsapp',
]);

/** True if `platform` can legitimately reach the 'delivered' status. */
export function channelHasDeliveryReceipt(platform: string | null | undefined): boolean {
  return !!platform && CHANNELS_WITH_DELIVERY_RECEIPT.has(platform);
}

/**
 * The status an outbound message should hold once the provider has *seen* it,
 * given the channel. For Instagram (no delivery event) a "seen"/`messaging_seen`
 * webhook promotes straight from 'sent' -> 'read'; for the others it's the usual
 * 'delivered' -> 'read'. Callers use this to build the `.in()` filter of statuses
 * that a read-receipt is allowed to advance from.
 */
export function statusesReadReceiptAdvancesFrom(platform: string | null | undefined): string[] {
  return channelHasDeliveryReceipt(platform)
    ? ['sent', 'delivered']
    : ['sent']; // Instagram never passes through 'delivered'
}
