import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { sendCalendarSMS } from '@/lib/calendar/sms';

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

    const start24h = new Date(in24Hours.getTime() - 15 * 60000).toISOString();
    const end24h = new Date(in24Hours.getTime() + 15 * 60000).toISOString();
    const start1h = new Date(in1Hour.getTime() - 15 * 60000).toISOString();
    const end1h = new Date(in1Hour.getTime() + 15 * 60000).toISOString();

    const { data: upcoming, error } = await supabase
      .from('appointments')
      .select(`
        id, title, start_time, meeting_link, workspace_id,
        contact:contacts(first_name, last_name, email, phone)
      `)
      .in('status', ['confirmed', 'scheduled'])
      .or(`and(start_time.gte.${start24h},start_time.lte.${end24h},reminder_24h_sent.eq.false),and(start_time.gte.${start1h},start_time.lte.${end1h},reminder_1h_sent.eq.false)`);

    if (error || !upcoming) return NextResponse.json({ success: false, error: 'Query failed' });
    if (upcoming.length === 0) return NextResponse.json({ success: true, message: 'No reminders to send right now' });

    let sentCount = 0;

    for (const apt of upcoming) {
      const is1Hour = new Date(apt.start_time).getTime() - now.getTime() < 2 * 60 * 60 * 1000;
      const typeStr = is1Hour ? '1 hour' : '24 hours';
      
      const email = Array.isArray(apt.contact) ? apt.contact[0]?.email : (apt.contact as any)?.email;
      const phone = Array.isArray(apt.contact) ? apt.contact[0]?.phone : (apt.contact as any)?.phone;
      const name = Array.isArray(apt.contact) ? apt.contact[0]?.first_name : (apt.contact as any)?.first_name;

      if (!email && !phone) continue;
      const messageText = `Hi ${name || 'there'},

Just a quick reminder that your meeting "${apt.title}" is coming up in ${typeStr}!

Start time: ${new Date(apt.start_time).toLocaleString()}
Meeting Link: ${apt.meeting_link || 'TBD'}

See you soon!`;

      try {
        if (email) await sendEmail({ to: email, subject: `Reminder: Upcoming Meeting in ${typeStr}`, text: messageText, tags: [{ name: 'category', value: 'calendar_reminder' }] as any } as any);
        if (phone) await sendCalendarSMS(apt.workspace_id, phone, `Reminder: "${apt.title}" starts in ${typeStr}. Link: ${apt.meeting_link || 'TBD'}`);

        await supabase.from('appointments').update(is1Hour ? { reminder_1h_sent: true } : { reminder_24h_sent: true }).eq('id', apt.id);
        sentCount++;
      } catch (err) {}
    }

    return NextResponse.json({ success: true, reminders_sent: sentCount });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
