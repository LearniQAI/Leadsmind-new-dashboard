import { createClient } from '@supabase/supabase-js';

// Mock WebSocket to prevent Supabase realtime crash in Node 20
if (typeof global !== 'undefined' && !(global as any).WebSocket) {
  (global as any).WebSocket = class {};
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Checks upcoming sessions and queues reminder emails for RSVP'ed and course-enrolled students.
 */
export async function checkAndSendSessionReminders() {
  console.log('[Reminder Worker] Checking for upcoming sessions requiring reminders...');
  const now = new Date();
  
  // 24 hours window
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // 1 hour window
  const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);

  // 1. Fetch upcoming sessions
  const { data: sessions, error } = await supabaseAdmin
    .from('lms_expert_sessions')
    .select('*, expert:lms_expert_profiles(*), course:courses(title, workspace_id)')
    .gt('start_time', now.toISOString())
    .lt('start_time', in24Hours.toISOString());

  if (error) {
    console.error('[Reminder Worker] Error fetching sessions:', error);
    return;
  }

  if (!sessions || sessions.length === 0) {
    console.log('[Reminder Worker] No upcoming sessions found.');
    return;
  }

  for (const session of sessions) {
    const startTime = new Date(session.start_time);
    const diffMs = startTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    let send24h = false;
    let send1h = false;

    if (diffHours <= 24 && diffHours > 1 && !session.reminder_24h_sent) {
      send24h = true;
    } else if (diffHours <= 1 && !session.reminder_1h_sent) {
      send1h = true;
    }

    if (!send24h && !send1h) continue;

    console.log(`[Reminder Worker] Preparing reminders for session: ${session.id} (${session.session_type})`);

    // Fetch RSVP'ed contacts
    const { data: rsvps } = await supabaseAdmin
      .from('lms_session_rsvps')
      .select('contact:contacts(id, email, first_name)')
      .eq('session_id', session.id);

    // Fetch all enrolled contacts as fallback/primary list for group/cohort/drop_in
    const { data: enrollments } = await supabaseAdmin
      .from('enrollments')
      .select('contact:contacts(id, email, first_name)')
      .eq('course_id', session.course_id);

    // Merge contacts (avoid duplicates)
    const contactMap = new Map<string, any>();
    
    if (rsvps) {
      rsvps.forEach((r: any) => {
        if (r.contact) contactMap.set(r.contact.id, r.contact);
      });
    }

    // For group, cohort, or drop-in, notify all enrolled students
    if (session.session_type !== 'private' && enrollments) {
      enrollments.forEach((e: any) => {
        if (e.contact) contactMap.set(e.contact.id, e.contact);
      });
    }

    const contacts = Array.from(contactMap.values());

    for (const contact of contacts) {
      const timeframe = send1h ? '1 hour' : '24 hours';
      const subject = `Reminder: Live Session starting in ${timeframe}!`;
      const bodyHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2>Upcoming Live Class Reminder</h2>
          <p>Hi ${contact.first_name || 'Student'},</p>
          <p>This is a reminder that the live <strong>${session.session_type.replace('_', ' ')}</strong> session for your course <strong>${session.course.title}</strong> is starting in ${timeframe}.</p>
          <p><strong>Expert Host:</strong> ${session.expert.name}</p>
          <p><strong>Start Time:</strong> ${startTime.toLocaleString()}</p>
          <div style="margin: 24px 0;">
            <a href="${session.meeting_url}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Join Live Session</a>
          </div>
          <p>We look forward to seeing you there!</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 11px; color: #64748b;">This email was sent automatically by LeadsMind LMS.</p>
        </div>
      `;

      // Insert into email_queue
      await supabaseAdmin
        .from('email_queue')
        .insert({
          workspace_id: session.course.workspace_id,
          to_email: contact.email,
          subject,
          body_html: bodyHtml,
          priority: 5, // high priority
          status: 'pending',
          attempts: 0
        });
    }

    // Update session sent flag
    const updateData: any = {};
    if (send24h) updateData.reminder_24h_sent = true;
    if (send1h) updateData.reminder_1h_sent = true;

    await supabaseAdmin
      .from('lms_expert_sessions')
      .update(updateData)
      .eq('id', session.id);
  }
}
