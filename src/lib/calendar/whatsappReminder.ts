import { MetaAdapter } from '@/lib/meta/MetaAdapter';
import { isWithinWhatsAppSessionWindow } from '@/lib/meta/whatsappWindow';
import { logger } from '@/shared/logger';

// Task 68 — WhatsApp appointment reminders for /api/cron/reminders.
//
// Reuses the project's ONE real WhatsApp-sending stack:
//   - the workspace's platform_connections (platform = 'whatsapp') credentials
//   - MetaAdapter.sendWhatsApp / .sendWhatsAppTemplate (WhatsApp Cloud API)
//   - isWithinWhatsAppSessionWindow(conversations.last_customer_message_at) —
//     the same 24h customer-service-window resolution the whatsapp-dispatch
//     broadcast worker uses.
//
// Compliance (identical rule to whatsapp-dispatch/route.ts):
//   * inside the 24h window  -> a free-text message is legal; send the same
//     body the SMS reminder uses (so the meeting link / honest link-status
//     note carry through unchanged).
//   * outside the window     -> business-initiated messaging MUST use a
//     pre-approved template; send the `appointment_reminder` UTILITY template
//     (name/lang overridable per deployment). No template configured/approved
//     -> skip cleanly (never force free-text — Meta rejects it anyway).
//   * contact.opted_out / sms_opt_out -> skip (re-checked at send time).
//
// Every outcome is a returned value, never a throw — the caller's email/SMS
// reminders and the reminder-sent flag must be completely unaffected by
// WhatsApp.

const TEMPLATE_NAME = process.env.WHATSAPP_APPOINTMENT_REMINDER_TEMPLATE || 'appointment_reminder';
const TEMPLATE_LANG = process.env.WHATSAPP_APPOINTMENT_REMINDER_LANG || 'en_US';

export interface WhatsAppReminderParams {
  /** platform_connections.credentials for this workspace's WhatsApp connection (or null/undefined if none). */
  credentials: unknown;
  contact: {
    id: string;
    first_name: string | null;
    phone: string | null;
    opted_out?: boolean | null;
    sms_opt_out?: boolean | null;
  };
  /** conversations.last_customer_message_at for (contact, platform='whatsapp'), for the 24h window. */
  lastCustomerMessageAt?: string | null;
  appointment: { id: string; title: string | null; start_time: string };
  /** The exact body the SMS channel sends — reused verbatim for the in-window free-text path. */
  smsBody: string;
}

export type WhatsAppReminderResult =
  | { status: 'sent'; usedTemplate: boolean; externalId?: string }
  | { status: 'skipped'; reason: 'no_connection' | 'no_number' | 'opted_out' | 'no_template' }
  | { status: 'failed'; error: string };

export async function sendWhatsAppAppointmentReminder(
  params: WhatsAppReminderParams,
): Promise<WhatsAppReminderResult> {
  const { credentials, contact, lastCustomerMessageAt, appointment, smsBody } = params;

  if (!credentials) return { status: 'skipped', reason: 'no_connection' };
  if (!contact.phone) return { status: 'skipped', reason: 'no_number' };
  if (contact.opted_out || contact.sms_opt_out) return { status: 'skipped', reason: 'opted_out' };

  const cleanPhone = contact.phone.startsWith('+') ? contact.phone : `+${contact.phone}`;
  const adapter = new MetaAdapter(credentials as any);

  try {
    if (isWithinWhatsAppSessionWindow(lastCustomerMessageAt)) {
      const res = await adapter.sendWhatsApp(cleanPhone, smsBody);
      if (!res.success) return { status: 'failed', error: res.error || 'WhatsApp send failed' };
      return { status: 'sent', usedTemplate: false, externalId: res.externalId };
    }

    if (!TEMPLATE_NAME) return { status: 'skipped', reason: 'no_template' };

    const start = new Date(appointment.start_time);
    const dateStr = start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const res = await adapter.sendWhatsAppTemplate(cleanPhone, TEMPLATE_NAME, TEMPLATE_LANG, [
      contact.first_name || 'there',
      dateStr,
      timeStr,
    ]);
    if (!res.success) return { status: 'failed', error: res.error || 'WhatsApp template send failed' };
    return { status: 'sent', usedTemplate: true, externalId: res.externalId };
  } catch (err: any) {
    logger.error({ err: err?.message, appointmentId: appointment.id }, 'calendar.whatsapp_reminder.send_failed');
    return { status: 'failed', error: err?.message || 'WhatsApp send threw' };
  }
}
