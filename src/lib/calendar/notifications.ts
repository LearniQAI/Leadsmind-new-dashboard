import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { generateManageToken } from '@/lib/calendar/manageToken';
import { generateWaitlistToken } from '@/lib/calendar/waitlistToken';
import { meetingLinkNote, type MeetingLinkStatus } from '@/lib/calendar/meetingLink';
import { logger } from '@/shared/logger';
import { format } from 'date-fns';

// Booking-completion notifications for the Calendar & Booking module.
// Deliberately reuses the project's one established email-sending mechanism
// (src/lib/email.ts's sendEmail, the same Resend wrapper Campaigns/Tasks/etc.
// already use) — no second email pipeline. Plain async functions, not 'use
// server' exports: these are internal helpers called from within existing
// server actions (bookAppointment, createAppointment, bookAppointmentFromPortal,
// and the manage-token cancel/reschedule actions below), not independently
// client-invocable.
//
// All lookups use the admin client. This runs from public.ts's bookAppointment
// (already an unauthenticated, admin-client code path per calendar.md) as well
// as from authenticated paths — using one client consistently here avoids a
// second RLS-shaped code path that could behave differently depending on caller.

interface AppointmentForNotification {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  meeting_link: string | null;
  meeting_mode: string | null;
  status: string;
  workspace_id: string;
  user_id: string | null;
  calendar_id: string | null;
  metadata: Record<string, any> | null;
  contact: { first_name: string | null; last_name: string | null; email: string | null } | null;
  calendar: { name: string; calendar_type: string; timezone: string | null } | null;
}

async function loadAppointment(appointmentId: string): Promise<AppointmentForNotification | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, title, start_time, end_time, meeting_link, meeting_mode, status, workspace_id, user_id, calendar_id, metadata,
      contact:contacts(first_name, last_name, email),
      calendar:booking_calendars(name, calendar_type, timezone)
    `)
    .eq('id', appointmentId)
    .single();

  if (error || !data) return null;
  return data as unknown as AppointmentForNotification;
}

async function resolveHostEmail(workspaceId: string, userId: string | null): Promise<{ email: string; name: string } | null> {
  const supabase = createAdminClient();

  // Round-robin/collective bookings that resolved a specific assignee carry
  // it on appointments.user_id — prefer that.
  if (userId) {
    const { data: user } = await supabase.from('users').select('email, first_name, last_name').eq('id', userId).maybeSingle();
    if (user?.email) return { email: user.email, name: [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Team' };
  }

  // Personal/collective calendars don't store a per-appointment assignee
  // (confirmed in calendar.md's trace of public.ts/appointments.ts) — fall
  // back to the workspace owner so staff are never simply never notified.
  const { data: workspace } = await supabase.from('workspaces').select('owner_id').eq('id', workspaceId).maybeSingle();
  if (!workspace?.owner_id) return null;

  const { data: owner } = await supabase.from('users').select('email, first_name, last_name').eq('id', workspace.owner_id).maybeSingle();
  if (!owner?.email) return null;
  return { email: owner.email, name: [owner.first_name, owner.last_name].filter(Boolean).join(' ') || 'Team' };
}

function formatWhen(startIso: string, endIso: string, timezone: string | null): string {
  // Calendars carry an explicit timezone (scheduling.ts's slot computation
  // already treats calendar.timezone as the source of truth for wall-clock
  // times) — state it explicitly rather than rendering an ambiguous local
  // time, per this task's explicit requirement. The booker's own browser
  // timezone isn't captured anywhere in the appointments/contacts schema, so
  // there's nothing truthful to convert into instead.
  const tz = timezone || 'UTC';
  const start = new Date(startIso);
  const end = new Date(endIso);
  return `${format(start, 'EEEE, MMMM d, yyyy')} · ${format(start, 'HH:mm')}–${format(end, 'HH:mm')} (${tz})`;
}

function bookerName(contact: AppointmentForNotification['contact']): string {
  return [contact?.first_name, contact?.last_name].filter(Boolean).join(' ').trim() || 'Guest';
}

interface NotifyOptions {
  // Set when a waitlist entry was just promoted into this confirmation
  // (Part 1's explicit requirement: a promoted booking gets the same email).
  reason?: 'booked' | 'waitlist_promoted' | 'rescheduled' | 'cancelled';
  previousWhen?: string; // for reschedule emails, the old date/time string
  // Group-session waitlist promotions email the person who claimed the spot,
  // NOT appointments.contact (the session's original booker). Task 65.
  overrideRecipient?: { email: string; name: string | null };
  // Per-attendee record (booking_waitlists.id) for a group session. When set,
  // the booker's "manage this booking" link is scoped to THIS attendee's own
  // record (/book/waitlist/<token>) rather than the shared session manage
  // token — so each attendee of a class session manages only their own spot.
  attendeeRecordId?: string;
  // Task 69 — when this booking is the first occurrence of a recurring series,
  // a one-line human summary of the recurrence ("Repeats weekly, 4 occurrences")
  // added to both the booker and host emails so the confirmation is honest about
  // the whole series, not just the first meeting.
  recurrenceSummary?: string;
}

export async function sendBookingConfirmation(appointmentId: string, options: NotifyOptions = {}) {
  const apt = await loadAppointment(appointmentId);
  if (!apt) {
    logger.warn({ appointmentId }, 'calendar.notification.appointment_not_found');
    return;
  }

  const when = formatWhen(apt.start_time, apt.end_time, apt.calendar?.timezone ?? null);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const manageUrl = options.attendeeRecordId
    ? `${appUrl}/book/waitlist/${generateWaitlistToken(options.attendeeRecordId)}`
    : `${appUrl}/book/manage/${generateManageToken(apt.id)}`;
  const host = await resolveHostEmail(apt.workspace_id, apt.user_id);
  const isRoundRobin = apt.calendar?.calendar_type === 'round_robin';
  const linkStatus = (apt.metadata?.meeting_link_status as MeetingLinkStatus) ?? 'none';

  const bookerLines = [
    `Your booking is confirmed.`,
    ``,
    `${apt.title}`,
    when,
    options.recurrenceSummary ? options.recurrenceSummary : null,
    isRoundRobin && host ? `Host: ${host.name}` : null,
    apt.meeting_link ? `Meeting link: ${apt.meeting_link}` : null,
    meetingLinkNote(linkStatus, 'booker'),
    ``,
    `Need to make a change? Manage this booking: ${manageUrl}`,
  ].filter(Boolean) as string[];

  const bookerRecipient = options.overrideRecipient?.email ?? apt.contact?.email ?? null;
  if (bookerRecipient) {
    try {
      await sendEmail({
        to: bookerRecipient,
        subject: options.reason === 'waitlist_promoted' ? `You're off the waitlist: ${apt.title}` : `Booking confirmed: ${apt.title}`,
        text: bookerLines.join('\n'),
        tags: [{ name: 'category', value: 'calendar_booking_confirmation' }] as any,
      } as any);
    } catch (err) {
      logger.error({ err, appointmentId }, 'calendar.notification.booker_confirmation.failed');
    }
  }

  if (host?.email) {
    const staffLines = [
      `New booking: ${apt.title}`,
      when,
      options.recurrenceSummary ? options.recurrenceSummary : null,
      `Booked by: ${bookerName(apt.contact)}${apt.contact?.email ? ` (${apt.contact.email})` : ''}`,
      apt.meeting_link ? `Meeting link: ${apt.meeting_link}` : null,
      meetingLinkNote(linkStatus, 'host'),
    ].filter(Boolean) as string[];

    try {
      await sendEmail({
        to: host.email,
        subject: `New booking on your calendar: ${apt.title}`,
        text: staffLines.join('\n'),
        tags: [{ name: 'category', value: 'calendar_booking_staff_notice' }] as any,
      } as any);
    } catch (err) {
      logger.error({ err, appointmentId }, 'calendar.notification.staff_notice.failed');
    }
  }
}

function calendarSyncWarning(apt: AppointmentForNotification, action: 'moved' | 'cancelled'): string | null {
  if (!apt.metadata?.calendar_sync_error) return null;
  return `\n⚠ This booking's ${action === 'cancelled' ? 'cancellation' : 'new time'} could not be synced to your connected Google/Outlook calendar — please update (or remove) the event there manually, or reconnect the calendar in Settings.`;
}

export async function sendCancellationNotice(appointmentId: string, when: string) {
  const apt = await loadAppointment(appointmentId);
  if (!apt) return;
  const host = await resolveHostEmail(apt.workspace_id, apt.user_id);

  if (apt.contact?.email) {
    try {
      await sendEmail({
        to: apt.contact.email,
        subject: `Booking cancelled: ${apt.title}`,
        text: `Your booking "${apt.title}" (${when}) has been cancelled.`,
        tags: [{ name: 'category', value: 'calendar_booking_cancellation' }] as any,
      } as any);
    } catch (err) {
      logger.error({ err, appointmentId }, 'calendar.notification.cancel_booker.failed');
    }
  }
  if (host?.email) {
    try {
      await sendEmail({
        to: host.email,
        subject: `Booking cancelled: ${apt.title}`,
        text: `${bookerName(apt.contact)} cancelled "${apt.title}" (${when}).${calendarSyncWarning(apt, 'cancelled') ?? ''}`,
        tags: [{ name: 'category', value: 'calendar_booking_cancellation_staff' }] as any,
      } as any);
    } catch (err) {
      logger.error({ err, appointmentId }, 'calendar.notification.cancel_staff.failed');
    }
  }
}

export async function sendRescheduleNotice(appointmentId: string, previousWhen: string) {
  const apt = await loadAppointment(appointmentId);
  if (!apt) return;
  const newWhen = formatWhen(apt.start_time, apt.end_time, apt.calendar?.timezone ?? null);
  const host = await resolveHostEmail(apt.workspace_id, apt.user_id);
  const manageToken = generateManageToken(apt.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const manageUrl = `${appUrl}/book/manage/${manageToken}`;
  const linkStatus = (apt.metadata?.meeting_link_status as MeetingLinkStatus) ?? 'none';

  if (apt.contact?.email) {
    try {
      await sendEmail({
        to: apt.contact.email,
        subject: `Booking rescheduled: ${apt.title}`,
        text: [
          `Your booking "${apt.title}" was moved.`,
          `Previous time: ${previousWhen}`,
          `New time: ${newWhen}`,
          apt.meeting_link ? `Meeting link: ${apt.meeting_link}` : null,
          meetingLinkNote(linkStatus, 'booker'),
          `Manage this booking: ${manageUrl}`,
        ].filter(Boolean).join('\n'),
        tags: [{ name: 'category', value: 'calendar_booking_reschedule' }] as any,
      } as any);
    } catch (err) {
      logger.error({ err, appointmentId }, 'calendar.notification.reschedule_booker.failed');
    }
  }
  if (host?.email) {
    try {
      await sendEmail({
        to: host.email,
        subject: `Booking rescheduled: ${apt.title}`,
        text: `${bookerName(apt.contact)} rescheduled "${apt.title}" from ${previousWhen} to ${newWhen}.${calendarSyncWarning(apt, 'moved') ?? ''}`,
        tags: [{ name: 'category', value: 'calendar_booking_reschedule_staff' }] as any,
      } as any);
    } catch (err) {
      logger.error({ err, appointmentId }, 'calendar.notification.reschedule_staff.failed');
    }
  }
}
