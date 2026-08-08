// WhatsApp's customer-service window: a business can free-text a contact for
// 24 hours after that contact's last inbound message; outside that window a
// business-initiated message must use a pre-approved template. The window's
// clock is conversations.last_customer_message_at, already updated on every
// inbound WhatsApp message by processInboundComplianceAndWindow() in
// webhooks/meta/route.ts — this just reads that same field.
const WHATSAPP_SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isWithinWhatsAppSessionWindow(lastCustomerMessageAt: string | null | undefined): boolean {
  if (!lastCustomerMessageAt) return false;
  const elapsed = Date.now() - new Date(lastCustomerMessageAt).getTime();
  return elapsed >= 0 && elapsed < WHATSAPP_SESSION_WINDOW_MS;
}
