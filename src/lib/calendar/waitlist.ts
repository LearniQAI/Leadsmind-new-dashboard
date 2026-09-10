import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { generateWaitlistToken } from '@/lib/calendar/waitlistToken';
import { logger } from '@/shared/logger';
import { format } from 'date-fns';

// Task 65 — the waitlist offer → accept → advance loop.
//
// The data model (phase20 migration) is per-GROUP-SESSION: one `appointments`
// row with max_attendees / current_attendee_count, and `booking_waitlists`
// rows (position, offered_at, offer_expires_at, confirmed) for people waiting
// on a full session. A DB trigger (tr_cancel_promotion) already marks the next
// person `offered` (2h window) when current_attendee_count drops — but nothing
// ever sent that person anything, and nothing advanced a lapsed offer. This
// module fills both gaps, reusing sendEmail (the one project email pipeline)
// and the same HMAC-token pattern as /book/manage/[token].

export const OFFER_WINDOW_MS = 2 * 60 * 60 * 1000; // matches the DB trigger + offerWaitlistSpot

interface WaitlistEntryForOffer {
  id: string;
  appointment_id: string;
  offered_at: string | null;
  offer_expires_at: string | null;
  contact: { first_name: string | null; last_name: string | null; email: string | null } | null;
  appointment: {
    title: string | null;
    start_time: string | null;
    end_time: string | null;
    calendar: { name: string | null; timezone: string | null } | null;
  } | null;
}

function whenLabel(startIso: string | null, endIso: string | null, tz: string | null): string {
  if (!startIso) return 'a scheduled time';
  const t = tz || 'UTC';
  const s = new Date(startIso);
  const e = endIso ? new Date(endIso) : null;
  return `${format(s, 'EEEE, MMMM d, yyyy')} · ${format(s, 'HH:mm')}${e ? `–${format(e, 'HH:mm')}` : ''} (${t})`;
}

async function loadEntry(entryId: string): Promise<WaitlistEntryForOffer | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('booking_waitlists')
    .select(`
      id, appointment_id, offered_at, offer_expires_at,
      contact:contacts(first_name, last_name, email),
      appointment:appointments(title, start_time, end_time, calendar:booking_calendars(name, timezone))
    `)
    .eq('id', entryId)
    .maybeSingle();
  return (data as unknown as WaitlistEntryForOffer) ?? null;
}

/**
 * Emails one waitlisted contact their time-limited accept link. Best-effort —
 * a delivery failure is logged, never thrown back into the cancellation /
 * cron path.
 */
export async function sendWaitlistOfferEmail(entryId: string): Promise<void> {
  const entry = await loadEntry(entryId);
  if (!entry?.contact?.email || !entry.appointment) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const acceptUrl = `${appUrl}/book/waitlist/${generateWaitlistToken(entry.id)}`;
  const when = whenLabel(entry.appointment.start_time, entry.appointment.end_time, entry.appointment.calendar?.timezone ?? null);
  const expiresAt = entry.offer_expires_at ? new Date(entry.offer_expires_at) : new Date(Date.now() + OFFER_WINDOW_MS);
  const name = entry.contact.first_name || 'there';

  try {
    await sendEmail({
      to: entry.contact.email,
      subject: `A spot opened up: ${entry.appointment.title ?? 'your waitlisted session'}`,
      text: [
        `Hi ${name},`,
        ``,
        `A spot has opened up for "${entry.appointment.title ?? 'the session'}" you're waitlisted for:`,
        when,
        ``,
        `Claim it here (first come, first served):`,
        acceptUrl,
        ``,
        `This offer expires ${format(expiresAt, 'EEEE, MMMM d')} at ${format(expiresAt, 'HH:mm')} — after that it passes to the next person on the list.`,
      ].join('\n'),
      config: { tags: [{ name: 'category', value: 'calendar_waitlist_offer' }] },
    });
  } catch (err) {
    logger.error({ err, entryId }, 'calendar.waitlist.offer_email.failed');
  }
}

/**
 * Confirmation email when someone JOINS a waitlist from the public page —
 * "you're #N, we'll email you if a spot opens". No accept link (nothing's
 * been offered yet).
 */
export async function sendWaitlistJoinAck(appointmentId: string, contactId: string, position: number): Promise<void> {
  const supabase = createAdminClient();
  const { data: contact } = await supabase.from('contacts').select('first_name, email').eq('id', contactId).maybeSingle();
  if (!contact?.email) return;
  const { data: apt } = await supabase
    .from('appointments')
    .select('title, start_time, end_time, calendar:booking_calendars(name, timezone)')
    .eq('id', appointmentId)
    .maybeSingle();
  if (!apt) return;

  const cal = (apt as any).calendar;
  const when = whenLabel(apt.start_time, apt.end_time, cal?.timezone ?? null);
  try {
    await sendEmail({
      to: contact.email,
      subject: `You're on the waitlist: ${apt.title ?? 'the session'}`,
      text: [
        `Hi ${contact.first_name || 'there'},`,
        ``,
        `You're #${position} on the waitlist for "${apt.title ?? 'the session'}":`,
        when,
        ``,
        `The session is currently full. If a spot opens up we'll email you a link to claim it — offers are first come, first served and time-limited, so keep an eye on your inbox.`,
      ].join('\n'),
      config: { tags: [{ name: 'category', value: 'calendar_waitlist_join' }] },
    });
  } catch (err) {
    logger.error({ err, appointmentId, contactId }, 'calendar.waitlist.join_ack.failed');
  }
}

/**
 * Called right after a group-session spot frees (a cancellation decremented
 * current_attendee_count). The DB trigger has, in the same transaction,
 * already set `offered_at` on the next eligible person — email everyone who
 * was freshly offered in the last minute (covers the trigger offering a
 * second person on a second concurrent free-up) without re-emailing an older
 * still-live offer.
 */
export async function notifyNewlyOfferedWaitlist(appointmentId: string): Promise<void> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 60_000).toISOString();
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from('booking_waitlists')
    .select('id')
    .eq('appointment_id', appointmentId)
    .eq('confirmed', false)
    .is('cancelled_at', null)
    .gte('offered_at', cutoff)
    .gt('offer_expires_at', nowIso);

  for (const e of data ?? []) {
    await sendWaitlistOfferEmail((e as any).id);
  }

  // Safety net: if the trigger didn't offer anyone (its own edge cases) but a
  // spot is genuinely free and there's an un-offered person waiting, do it here.
  if (!data || data.length === 0) {
    await advanceWaitlistForAppointment(appointmentId);
  }
}

/**
 * Offer the next eligible person for ONE appointment, if a spot is free and
 * nobody currently holds a live offer. Skips people whose offer already
 * lapsed (they forfeited their turn) by sorting un-offered people first;
 * only comes back to a lapsed person if literally everyone has lapsed.
 * Returns the entry that was offered, or null.
 */
export async function advanceWaitlistForAppointment(appointmentId: string): Promise<{ id: string } | null> {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: apt } = await supabase
    .from('appointments')
    .select('id, max_attendees, current_attendee_count')
    .eq('id', appointmentId)
    .maybeSingle();
  if (!apt) return null;

  const freeSpots = (apt.max_attendees ?? 1) - (apt.current_attendee_count ?? 0);
  if (freeSpots <= 0) return null;

  const { data: entries } = await supabase
    .from('booking_waitlists')
    .select('id, offered_at, offer_expires_at')
    .eq('appointment_id', appointmentId)
    .eq('confirmed', false)
    .is('cancelled_at', null)
    .not('position', 'is', null)
    .order('position', { ascending: true });

  if (!entries || entries.length === 0) return null;

  // Someone already holds a live, unexpired offer — leave it be.
  const liveOffer = entries.find((e: any) => e.offered_at && e.offer_expires_at && e.offer_expires_at > nowIso);
  if (liveOffer) return null;

  // Prefer never-offered people (in position order); fall back to the
  // earliest lapsed person only if every remaining person has lapsed.
  const neverOffered = entries.filter((e: any) => !e.offered_at);
  const next = neverOffered[0] ?? entries[0];

  const { error } = await supabase
    .from('booking_waitlists')
    .update({ offered_at: nowIso, offer_expires_at: new Date(Date.now() + OFFER_WINDOW_MS).toISOString() })
    .eq('id', next.id);
  if (error) {
    logger.error({ err: error, appointmentId }, 'calendar.waitlist.advance.update_failed');
    return null;
  }

  await sendWaitlistOfferEmail(next.id);
  return { id: next.id };
}

/**
 * Cron body: for every group session whose current offer has lapsed
 * unaccepted, pass the offer to the next person (if a spot is still free).
 * Returns a small summary for the route.
 */
export async function advanceExpiredWaitlistOffers(): Promise<{ appointmentsScanned: number; advanced: number }> {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: lapsed } = await supabase
    .from('booking_waitlists')
    .select('appointment_id')
    .eq('confirmed', false)
    .is('cancelled_at', null)
    .not('offered_at', 'is', null)
    .lt('offer_expires_at', nowIso);

  const appointmentIds = [...new Set((lapsed ?? []).map((r: any) => r.appointment_id))];
  let advanced = 0;
  for (const id of appointmentIds) {
    const res = await advanceWaitlistForAppointment(id);
    if (res) advanced++;
  }
  return { appointmentsScanned: appointmentIds.length, advanced };
}

// ---------------------------------------------------------------------------
// Per-attendee records (migration 20260910000000).
//
// A booked class-session attendee is a `booking_waitlists` row with
// confirmed = true, position IS NULL, cancelled_at IS NULL — created atomically
// by fn_secure_booking_or_waitlist's "booked" branch. Each attendee manages
// ONLY their own row, via the same waitlistToken scoped to booking_waitlists.id.
// ---------------------------------------------------------------------------

export interface AttendeeRecord {
  id: string;
  appointment_id: string;
  workspace_id: string;
  contact_id: string;
  confirmed: boolean;
  cancelled_at: string | null;
  booked_at: string | null;
  contact: { first_name: string | null; last_name: string | null; email: string | null } | null;
  appointment: {
    id: string;
    title: string | null;
    start_time: string | null;
    end_time: string | null;
    status: string | null;
    current_attendee_count: number | null;
    max_attendees: number | null;
    meeting_link: string | null;
    calendar: { name: string | null; timezone: string | null; cancellation_window_hours: number | null } | null;
  } | null;
}

/** Load one per-attendee record with its session + contact. */
export async function getAttendeeRecord(recordId: string): Promise<AttendeeRecord | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('booking_waitlists')
    .select(`
      id, appointment_id, workspace_id, contact_id, confirmed, cancelled_at, booked_at,
      contact:contacts(first_name, last_name, email),
      appointment:appointments(id, title, start_time, end_time, status, current_attendee_count, max_attendees, meeting_link,
        calendar:booking_calendars(name, timezone, cancellation_window_hours))
    `)
    .eq('id', recordId)
    .maybeSingle();
  return (data as unknown as AttendeeRecord) ?? null;
}

/**
 * ONE attendee cancels THEIR OWN spot on a group session. Marks only that
 * `booking_waitlists` row cancelled, decrements the session's attendee count so
 * the freed spot flows to the waitlist (DB trigger + notifyNewlyOfferedWaitlist),
 * and emails that one attendee. NEVER touches appointments.status — the session
 * itself is unaffected and every other attendee keeps their spot.
 *
 * `skipWindow` bypasses the calendar's cancellation-window lock — used only by
 * cancelClassSession (a host cancelling the whole session).
 */
export async function cancelAttendeeSpot(
  recordId: string,
  opts: { skipWindow?: boolean } = {}
): Promise<{ success: boolean; error?: string; appointmentId?: string }> {
  const supabase = createAdminClient();
  const rec = await getAttendeeRecord(recordId);

  if (!rec || !rec.appointment) return { success: false, error: 'This booking could not be found.' };
  if (!rec.confirmed || rec.cancelled_at) {
    return { success: false, error: 'This spot has already been cancelled.' };
  }

  if (!opts.skipWindow) {
    const startMs = rec.appointment.start_time ? new Date(rec.appointment.start_time).getTime() : 0;
    const windowHours = rec.appointment.calendar?.cancellation_window_hours ?? 24;
    if (startMs && startMs - Date.now() < windowHours * 60 * 60 * 1000) {
      return {
        success: false,
        error: `Cancellations close ${windowHours} hours before the session starts.`,
      };
    }
  }

  const { error: markErr } = await supabase
    .from('booking_waitlists')
    .update({ cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', recordId)
    .is('cancelled_at', null);
  if (markErr) {
    logger.error({ err: markErr, recordId }, 'calendar.attendee.cancel.mark_failed');
    return { success: false, error: 'Could not cancel your spot. Please try again.' };
  }

  // Free the seat. Guard against going below zero under concurrency.
  const current = rec.appointment.current_attendee_count ?? 0;
  if (current > 0) {
    await supabase
      .from('appointments')
      .update({ current_attendee_count: current - 1, updated_at: new Date().toISOString() })
      .eq('id', rec.appointment.id)
      .gt('current_attendee_count', 0);
  }

  if (!opts.skipWindow) {
    // The DB trigger has marked the next waitlisted person offered — email them.
    try {
      await notifyNewlyOfferedWaitlist(rec.appointment.id);
    } catch (err) {
      logger.error({ err, appointmentId: rec.appointment.id }, 'calendar.attendee.cancel.waitlist_offer_failed');
    }
  }

  if (rec.contact?.email) {
    const when = whenLabel(
      rec.appointment.start_time,
      rec.appointment.end_time,
      rec.appointment.calendar?.timezone ?? null
    );
    try {
      await sendEmail({
        to: rec.contact.email,
        subject: `Your spot is cancelled: ${rec.appointment.title ?? 'the session'}`,
        text: [
          `Hi ${rec.contact.first_name || 'there'},`,
          ``,
          `Your spot for "${rec.appointment.title ?? 'the session'}" has been cancelled:`,
          when,
          ``,
          `The session itself is still going ahead — this only affects your own booking. If this was a mistake, you can book again from the public page while spots last.`,
        ].join('\n'),
        config: { tags: [{ name: 'category', value: 'calendar_attendee_cancellation' }] },
      });
    } catch (err) {
      logger.error({ err, recordId }, 'calendar.attendee.cancel.email_failed');
    }
  }

  return { success: true, appointmentId: rec.appointment.id };
}

/**
 * A host cancels the WHOLE group session. Marks every active participation row
 * (booked attendees AND people still on the waitlist) cancelled, emails each
 * one, and makes NO waitlist offers — there is nothing to offer. Does not itself
 * flip appointments.status; the caller (deleteAppointment / updateAppointment /
 * updateAppointmentStatus) owns that.
 */
export async function cancelClassSession(appointmentId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: apt } = await supabase
    .from('appointments')
    .select('id, title, start_time, end_time, calendar:booking_calendars(name, timezone)')
    .eq('id', appointmentId)
    .maybeSingle();
  if (!apt) return;

  const { data: rows } = await supabase
    .from('booking_waitlists')
    .select('id, confirmed, contact:contacts(first_name, last_name, email)')
    .eq('appointment_id', appointmentId)
    .is('cancelled_at', null);

  if (!rows || rows.length === 0) return;

  const nowIso = new Date().toISOString();
  await supabase
    .from('booking_waitlists')
    .update({ cancelled_at: nowIso, updated_at: nowIso })
    .eq('appointment_id', appointmentId)
    .is('cancelled_at', null);

  const cal = (apt as any).calendar;
  const when = whenLabel(apt.start_time, apt.end_time, cal?.timezone ?? null);

  for (const row of rows as any[]) {
    const email = row.contact?.email;
    if (!email) continue;
    const wasBooked = row.confirmed === true;
    try {
      await sendEmail({
        to: email,
        subject: `Session cancelled: ${apt.title ?? 'your session'}`,
        text: [
          `Hi ${row.contact?.first_name || 'there'},`,
          ``,
          wasBooked
            ? `The session you were booked into has been cancelled by the host:`
            : `The session you were on the waitlist for has been cancelled by the host:`,
          when,
          ``,
          `You don't need to do anything. If a replacement session is scheduled you'll be able to book it from the public page.`,
        ].join('\n'),
        config: { tags: [{ name: 'category', value: 'calendar_session_cancelled' }] },
      });
    } catch (err) {
      logger.error({ err, appointmentId, recordId: row.id }, 'calendar.session.cancel.email_failed');
    }
  }
}
