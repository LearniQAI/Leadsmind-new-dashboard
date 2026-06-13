import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { sendSMS } from '@/lib/sms';

if (typeof global !== 'undefined' && !(global as any).WebSocket) {
  (global as any).WebSocket = class {};
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Sweeps appointments table to dispatch 24h/1h reminders and runs the no-show loop.
 */
export async function runBookingAutomations() {
  console.log('[booking-worker] Running booking notifications and no-show sweeps...');
  const now = new Date();

  // 1. Fetch upcoming appointments for reminders (within 24 hours)
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { data: upcoming } = await supabaseAdmin
    .from('appointments')
    .select('*, contact:contacts(first_name, email, phone)')
    .eq('status', 'scheduled')
    .gt('start_time', now.toISOString())
    .lt('start_time', in24Hours.toISOString());

  if (upcoming && upcoming.length > 0) {
    for (const apt of upcoming) {
      const startTime = new Date(apt.start_time);
      const diffMs = startTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      let is24h = diffHours <= 24 && diffHours > 1 && !apt.reminder_24h_sent;
      let is1h = diffHours <= 1 && !apt.reminder_1h_sent;

      if (!is24h && !is1h) continue;

      const timeframe = is1h ? '1 hour' : '24 hours';
      const subject = `Reminder: Meeting starts in ${timeframe}!`;
      const roomLink = apt.meeting_link || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/meet/${apt.id}`;

      // A. Send email notification
      if (apt.contact?.email) {
        try {
          await sendEmail({
            to: apt.contact.email,
            subject,
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <h2>Meeting Session Reminder</h2>
                <p>Hi ${apt.contact.first_name || 'Attendee'},</p>
                <p>This is a reminder that your scheduled session <strong>${apt.title}</strong> is starting in ${timeframe}.</p>
                <div style="margin: 24px 0;">
                  <a href="${roomLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Join Secure Room</a>
                </div>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 11px; color: #64748b;">LeadsMind Meet Automation</p>
              </div>
            `,
          });
        } catch (err) {
          console.error('[booking-worker] Email reminder failed:', err);
        }
      }

      // B. Send WhatsApp notification if phone number is attached
      if (apt.contact?.phone) {
        try {
          const formattedPhone = apt.contact.phone.startsWith('+') ? apt.contact.phone : `+27${apt.contact.phone.substring(1)}`;
          const whatsappTo = `whatsapp:${formattedPhone}`;
          await sendSMS({
            to: whatsappTo,
            message: `Hi ${apt.contact.first_name || 'there'}! This is a reminder that your LeadsMind meeting starts in ${timeframe}. Join here: ${roomLink}`,
            config: {
              fromNumber: `whatsapp:${process.env.TWILIO_PHONE_NUMBER || '+14155238886'}`,
            },
          });
        } catch (err) {
          console.error('[booking-worker] WhatsApp reminder failed:', err);
        }
      }

      // C. Update reminder status flags
      const updateFlags: any = {};
      if (is24h) updateFlags.reminder_24h_sent = true;
      if (is1h) updateFlags.reminder_1h_sent = true;

      await supabaseAdmin
        .from('appointments')
        .update(updateFlags)
        .eq('id', apt.id);
    }
  }

  // 2. No-Show Interceptor Loop (15 minutes past start_time)
  const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);
  
  // Find appointments that are past the 15-minute start mark and still scheduled
  const { data: noShowAppointments } = await supabaseAdmin
    .from('appointments')
    .select('*, contact:contacts(*)')
    .eq('status', 'scheduled')
    .lt('start_time', fifteenMinsAgo.toISOString())
    .gt('start_time', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()); // within last 2 hours

  if (noShowAppointments && noShowAppointments.length > 0) {
    for (const apt of noShowAppointments) {
      console.log(`[no-show-loop] Auto-marking appointment ${apt.id} as no-show.`);

      // A. Update appointment status to 'no_show'
      await supabaseAdmin
        .from('appointments')
        .update({ status: 'no_show' })
        .eq('id', apt.id);

      // B. Flag contact as "Unreliable" in CRM tags
      const currentTags = apt.contact?.tags || [];
      if (!currentTags.includes('Unreliable')) {
        const updatedTags = [...currentTags, 'Unreliable'];
        await supabaseAdmin
          .from('contacts')
          .update({ tags: updatedTags })
          .eq('id', apt.contact.id);
      }

      // C. Dispatch "Are you okay?" WhatsApp follow-up with rescheduling link
      if (apt.contact?.phone) {
        try {
          const rescheduleLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book/${apt.calendar_id}`;
          const formattedPhone = apt.contact.phone.startsWith('+') ? apt.contact.phone : `+27${apt.contact.phone.substring(1)}`;
          const whatsappTo = `whatsapp:${formattedPhone}`;
          
          await sendSMS({
            to: whatsappTo,
            message: `Hi ${apt.contact.first_name || 'there'}, we missed you at our scheduled meeting today. We hope everything is okay! You can easily reschedule a new slot using this link: ${rescheduleLink}`,
            config: {
              fromNumber: `whatsapp:${process.env.TWILIO_PHONE_NUMBER || '+14155238886'}`,
            },
          });
        } catch (err) {
          console.error('[no-show-loop] Failed to dispatch no-show WhatsApp:', err);
        }
      }

      // D. Log system activity record
      await supabaseAdmin
        .from('contact_activities')
        .insert({
          workspace_id: apt.workspace_id,
          contact_id: apt.contact_id,
          type: 'system',
          description: 'Appointment marked as Missed (No-Show). Unreliable tag applied and followup text dispatched.',
          metadata: {
            appointment_id: apt.id,
          },
        });
    }
  }
}
