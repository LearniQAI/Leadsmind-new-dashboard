// Server-side guards for an agent-initiated WhatsApp send (Communications Hub). The composer UI is not a control:
// the same checks must hold for any caller of sendMessage().
//  - an opted-out (or invalid-number) contact is never messaged (the unified SMS/WhatsApp opt-out check);
//  - free text is never sent outside WhatsApp's 24-hour customer-service window (Meta rejects it, and a template
//    reply is not available yet).
// Only WhatsApp conversations get the opt-out and window checks; every other channel returns null (allowed) without further queries.
// A conversation that cannot be found IN THIS WORKSPACE blocks the send for every channel: the guard must never allow a send it
// could not verify belongs to the caller's workspace.
import { getSmsOptOutReason } from '@/lib/smsOptOut';
import { isWithinWhatsAppSessionWindow } from '@/lib/meta/whatsappWindow';
import { logger } from '@/shared/logger';

export const WHATSAPP_WINDOW_CLOSED_MESSAGE = 'Outside the 24-hour window. Template replies are coming soon.';
export const WHATSAPP_OPTED_OUT_MESSAGE = 'This contact has opted out of WhatsApp messages (STOP), so you cannot message them.';
export const CONVERSATION_NOT_FOUND_MESSAGE = 'Conversation not found.';
export const WHATSAPP_INVALID_NUMBER_MESSAGE = "This contact's phone number is marked invalid and cannot be messaged.";
export const WHATSAPP_OPT_OUT_UNVERIFIED_MESSAGE = 'Could not verify this contact\'s opt-out status, so the message was not sent. Please try again.';

export type WhatsAppSendBlock = {
  error: string;
  code: 'opted_out' | 'invalid_number' | 'window_closed' | 'opt_out_check_failed' | 'conversation_not_found';
};

export async function checkWhatsAppSendAllowed(
  db: any,
  workspaceId: string,
  conversationId: string,
): Promise<WhatsAppSendBlock | null> {
  const { data: conv } = await db
    .from('conversations')
    .select('platform, external_thread_id, last_customer_message_at, contacts(phone, opted_out, sms_opt_out)')
    .eq('id', conversationId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (!conv) return { error: CONVERSATION_NOT_FOUND_MESSAGE, code: 'conversation_not_found' };
  if (conv.platform !== 'whatsapp') return null;

  const contact = Array.isArray(conv.contacts) ? conv.contacts[0] : conv.contacts;

  // Opt-out first: it wins over the window state.
  if (contact?.opted_out || contact?.sms_opt_out) {
    return { error: WHATSAPP_OPTED_OUT_MESSAGE, code: 'opted_out' };
  }
  try {
    const reason = await getSmsOptOutReason(db, workspaceId, contact?.phone || conv.external_thread_id || '');
    if (reason === 'invalid_number') return { error: WHATSAPP_INVALID_NUMBER_MESSAGE, code: 'invalid_number' };
    if (reason) return { error: WHATSAPP_OPTED_OUT_MESSAGE, code: 'opted_out' };
  } catch (err) {
    logger.error({ err, workspaceId, conversationId }, 'messaging.whatsapp_guard.opt_out_lookup.failed');
    return { error: WHATSAPP_OPT_OUT_UNVERIFIED_MESSAGE, code: 'opt_out_check_failed' };
  }

  // 24h window: the conversation clock, falling back to the newest inbound message for threads created before
  // the clock existed (the thread UI does the same).
  let lastInbound: string | null = conv.last_customer_message_at ?? null;
  if (!lastInbound) {
    const { data: m } = await db
      .from('messages')
      .select('sent_at')
      .eq('conversation_id', conversationId)
      .eq('workspace_id', workspaceId)
      .eq('direction', 'inbound')
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    lastInbound = m?.sent_at ?? null;
  }
  if (!isWithinWhatsAppSessionWindow(lastInbound)) {
    return { error: WHATSAPP_WINDOW_CLOSED_MESSAGE, code: 'window_closed' };
  }
  return null;
}
