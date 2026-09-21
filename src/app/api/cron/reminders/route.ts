import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { sendSMS } from '@/lib/sms';
import { resolveWorkspaceTwilioCredentials } from '@/lib/twilio/resolveWorkspaceTwilioCredentials';
import { meetingLinkNote, type MeetingLinkStatus } from '@/lib/calendar/meetingLinkStatus';
import { sendWhatsAppAppointmentReminder } from '@/lib/calendar/whatsappReminder';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const now = new Date();

    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    const in30Min = new Date(now.getTime() + 30 * 60 * 1000);

    const start24h = new Date(in24Hours.getTime() - 15 * 60000).toISOString();
    const end24h = new Date(in24Hours.getTime() + 15 * 60000).toISOString();
    const start1h = new Date(in1Hour.getTime() - 15 * 60000).toISOString();
    const end1h = new Date(in1Hour.getTime() + 15 * 60000).toISOString();
    // Tighter tolerance than the 24h/1h bands — this mark needs precision the
    // others don't, backed by the cron now running every 5 minutes instead of
    // hourly (vercel.json) so the window is reliably hit without drifting.
    const start30m = new Date(in30Min.getTime() - 5 * 60000).toISOString();
    const end30m = new Date(in30Min.getTime() + 5 * 60000).toISOString();

    const { data: upcoming, error } = await supabase
      .from('appointments')
      .select(`
        id, title, start_time, meeting_link, workspace_id, metadata,
        contact:contacts(id, first_name, last_name, email, phone, opted_out, sms_opt_out)
      `)
      .in('status', ['confirmed', 'scheduled'])
      .or(`and(start_time.gte.${start24h},start_time.lte.${end24h},reminder_24h_sent.eq.false),and(start_time.gte.${start1h},start_time.lte.${end1h},reminder_1h_sent.eq.false),and(start_time.gte.${start30m},start_time.lte.${end30m},reminder_30m_sent.eq.false)`);

    if (error || !upcoming) return NextResponse.json({ success: false, error: 'Query failed' });
    if (upcoming.length === 0) return NextResponse.json({ success: true, message: 'No reminders to send right now' });

    const workspaceIds = [...new Set(upcoming.map((apt) => apt.workspace_id))];
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id, twilio_sid, twilio_token, twilio_sid_encrypted, twilio_token_encrypted, twilio_number')
      .in('id', workspaceIds);
    const workspacesMap = new Map(workspaces?.map((w: any) => [w.id, w]));

    // WhatsApp reminder inputs (Task 68) — the workspace's ONE WhatsApp
    // connection + the per-contact 24h customer-service-window clock. Reused,
    // not reinvented: same platform_connections + conversations.last_customer_message_at
    // the whatsapp-dispatch broadcast worker reads.
    const contactField = (apt: any) => (Array.isArray(apt.contact) ? apt.contact[0] : apt.contact) ?? null;
    const contactIds = [...new Set(upcoming.map((apt) => contactField(apt)?.id).filter(Boolean))];

    const { data: waConnections } = await supabase
      .from('platform_connections')
      .select('workspace_id, credentials')
      .eq('platform', 'whatsapp')
      .in('workspace_id', workspaceIds);
    const waCredsMap = new Map<string, unknown>((waConnections ?? []).map((c: any) => [c.workspace_id, c.credentials]));

    const { data: waConversations } = contactIds.length
      ? await supabase
          .from('conversations')
          .select('contact_id, last_customer_message_at')
          .eq('platform', 'whatsapp')
          .in('workspace_id', workspaceIds)
          .in('contact_id', contactIds)
      : { data: [] as any[] };
    const waWindowMap = new Map<string, string | null>((waConversations ?? []).map((c: any) => [c.contact_id, c.last_customer_message_at]));

    let sentCount = 0;
    let whatsappSentCount = 0;

    for (const apt of upcoming) {
      const minutesOut = (new Date(apt.start_time).getTime() - now.getTime()) / 60000;
      // Same "which band did this fall in" heuristic the 1h/24h split already
      // used (re-derive from the delta rather than track which .or() branch
      // matched) — safe because the three bands don't overlap: 30min±5 tops
      // out at 35min, well under the 1h band's floor of 45min; 1h±15 tops out
      // at 75min, well under the 24h band's floor of ~23h45.
      const is30Min = minutesOut < 40;
      const is1Hour = !is30Min && minutesOut < 2 * 60;
      const typeStr = is30Min ? '30 minutes' : is1Hour ? '1 hour' : '24 hours';
      const reminderColumn = is30Min ? 'reminder_30m_sent' : is1Hour ? 'reminder_1h_sent' : 'reminder_24h_sent';

      const contact = contactField(apt);
      const email = contact?.email;
      const phone = contact?.phone;
      const name = contact?.first_name;

      if (!email && !phone) continue;

      // Task 63: a booking's meeting_link is now either a real link or
      // legitimately absent (Zoom "coming soon", phone/in-person). Never
      // invent a "TBD" link — mirror the confirmation email: show the link
      // line only when there is one, and append the honest status note.
      const linkStatus = ((apt as any).metadata?.meeting_link_status as MeetingLinkStatus) ?? 'none';
      const note = meetingLinkNote(linkStatus, 'booker');

      const messageText = [
        `Hi ${name || 'there'},`,
        ``,
        `Just a quick reminder that your meeting "${apt.title}" is coming up in ${typeStr}!`,
        ``,
        `Start time: ${new Date(apt.start_time).toLocaleString()}`,
        apt.meeting_link ? `Meeting Link: ${apt.meeting_link}` : null,
        note,
        ``,
        `See you soon!`,
      ].filter((l) => l !== null).join('\n');

      const smsText = [
        `Reminder: "${apt.title}" starts in ${typeStr}.`,
        apt.meeting_link ? `Link: ${apt.meeting_link}` : note,
      ].filter(Boolean).join(' ');

      let reminderRecorded = false;
      try {
        if (email) await sendEmail({ to: email, subject: `Reminder: Upcoming Meeting in ${typeStr}`, text: messageText, tags: [{ name: 'category', value: 'calendar_reminder' }] as any } as any);
        if (phone) {
          const workspace = workspacesMap.get(apt.workspace_id);
          const cleanPhone = phone.startsWith('+') ? phone : `+${phone}`;
          await sendSMS({
            workspaceId: apt.workspace_id,
            to: cleanPhone,
            message: smsText,
            config: {
              ...resolveWorkspaceTwilioCredentials(workspace),
              fromNumber: workspace?.twilio_number,
            },
          });
        }

        await supabase.from('appointments').update({ [reminderColumn]: true }).eq('id', apt.id);
        reminderRecorded = true;
        sentCount++;
      } catch (err) {
        logger.error({ err, appointmentId: apt.id, hasEmail: !!email, hasPhone: !!phone }, 'cron.reminders.delivery.failed');
      }

      // WhatsApp reminder — strictly additive and best-effort. Only attempted
      // once the reminder-sent flag is recorded, so a WhatsApp send can never
      // outlive an email/SMS failure into a duplicate on the next run. Isolated
      // from the try above: a WhatsApp problem (no connection, no consent,
      // non-WhatsApp number, template rejected) never errors the cron.
      if (!reminderRecorded) continue;
      try {
        const wa = await sendWhatsAppAppointmentReminder({
          credentials: waCredsMap.get(apt.workspace_id),
          contact: contact
            ? { id: contact.id, first_name: contact.first_name ?? null, phone: contact.phone ?? null, opted_out: contact.opted_out, sms_opt_out: contact.sms_opt_out }
            : { id: '', first_name: null, phone: null },
          lastCustomerMessageAt: contact ? waWindowMap.get(contact.id) : null,
          appointment: { id: apt.id, title: apt.title, start_time: apt.start_time },
          smsBody: smsText,
        });
        if (wa.status === 'sent') whatsappSentCount++;
        else logger.info({ appointmentId: apt.id, wa }, 'cron.reminders.whatsapp.outcome');
      } catch (waErr) {
        logger.error({ err: waErr, appointmentId: apt.id }, 'cron.reminders.whatsapp.unexpected');
      }
    }

    return NextResponse.json({ success: true, reminders_sent: sentCount, whatsapp_sent: whatsappSentCount });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
