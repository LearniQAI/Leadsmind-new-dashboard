'use server';

// Task 65 — public, token-authenticated waitlist-offer acceptance. Same shape
// as manage.ts: an opaque /book/waitlist/[token] link, re-verified server-side
// on every call, admin client (the accepter has no session). Accepting
// genuinely claims the real session spot (atomic capacity check) and reuses
// the same confirmation email as a normal booking.

import { createAdminClient } from '@/lib/supabase/server';
import { parseWaitlistToken } from '@/lib/calendar/waitlistToken';
import { advanceWaitlistForAppointment, getAttendeeRecord, cancelAttendeeSpot } from '@/lib/calendar/waitlist';
import { sendBookingConfirmation } from '@/lib/calendar/notifications';
import { logger } from '@/shared/logger';
import { format } from 'date-fns';

interface OfferContext {
  entry: {
    id: string;
    appointment_id: string;
    confirmed: boolean;
    offered_at: string | null;
    offer_expires_at: string | null;
    workspace_id: string;
  };
  appointment: {
    id: string;
    title: string | null;
    start_time: string | null;
    end_time: string | null;
    status: string;
    max_attendees: number | null;
    current_attendee_count: number | null;
    calendar: { name: string | null; timezone: string | null } | null;
  };
  contact: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

type OfferErrorCode = 'invalid' | 'expired' | 'confirmed' | 'gone' | 'full';
interface OfferResolution {
  ok: boolean;
  ctx?: OfferContext;
  error?: string;
  code?: OfferErrorCode;
}

async function resolveOffer(token: string): Promise<OfferResolution> {
  const parsed = parseWaitlistToken(token);
  if (!parsed) return { ok: false, error: 'This waitlist link is invalid.', code: 'invalid' };

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('booking_waitlists')
    .select(`
      id, appointment_id, confirmed, offered_at, offer_expires_at, workspace_id,
      contact:contacts(first_name, last_name, email),
      appointment:appointments(id, title, start_time, end_time, status, max_attendees, current_attendee_count, calendar:booking_calendars(name, timezone))
    `)
    .eq('id', parsed.waitlistEntryId)
    .maybeSingle();

  if (!data || !data.appointment) return { ok: false, error: 'This waitlist offer no longer exists.', code: 'gone' };

  const ctx = {
    entry: {
      id: data.id,
      appointment_id: data.appointment_id,
      confirmed: data.confirmed,
      offered_at: data.offered_at,
      offer_expires_at: data.offer_expires_at,
      workspace_id: data.workspace_id,
    },
    appointment: data.appointment as any,
    contact: (data as any).contact ?? null,
  } as OfferContext;

  if (ctx.entry.confirmed) return { ok: false, error: 'You have already claimed this spot.', code: 'confirmed' };
  if (ctx.appointment.status === 'cancelled') return { ok: false, error: 'This session has been cancelled.', code: 'gone' };
  if (!ctx.entry.offered_at || !ctx.entry.offer_expires_at) {
    return { ok: false, error: 'This spot has not been offered to you yet.', code: 'expired' };
  }
  if (new Date(ctx.entry.offer_expires_at).getTime() <= Date.now()) {
    return { ok: false, error: 'This offer has expired and passed to the next person on the waitlist.', code: 'expired' };
  }
  if ((ctx.appointment.current_attendee_count ?? 0) >= (ctx.appointment.max_attendees ?? 1)) {
    return { ok: false, error: 'This session just filled up.', code: 'full' };
  }

  return { ok: true, ctx };
}

/** Read-only summary for the accept page. */
export async function getWaitlistOffer(token: string) {
  const res = await resolveOffer(token);
  if (!res.ok || !res.ctx) return { success: false as const, error: res.error ?? 'This waitlist offer is unavailable.', code: res.code };

  const ctx = res.ctx;
  const tz = ctx.appointment.calendar?.timezone || 'UTC';
  return {
    success: true as const,
    data: {
      title: ctx.appointment.title,
      sessionName: ctx.appointment.calendar?.name ?? null,
      when: ctx.appointment.start_time
        ? `${format(new Date(ctx.appointment.start_time), 'EEEE, MMMM d, yyyy · HH:mm')} (${tz})`
        : null,
      offerExpiresAt: ctx.entry.offer_expires_at,
      firstName: ctx.contact?.first_name ?? null,
    },
  };
}

export async function acceptWaitlistOffer(token: string) {
  const res = await resolveOffer(token);
  if (!res.ok || !res.ctx) return { success: false as const, error: res.error ?? 'This waitlist offer is unavailable.', code: res.code };

  const ctx = res.ctx;
  const supabase = createAdminClient();

  // Atomic capacity claim — only succeeds while a spot is still free.
  const current = ctx.appointment.current_attendee_count ?? 0;
  const { data: claimed, error: claimErr } = await supabase
    .from('appointments')
    .update({ current_attendee_count: current + 1, updated_at: new Date().toISOString() })
    .eq('id', ctx.appointment.id)
    .eq('current_attendee_count', current)
    .lt('current_attendee_count', ctx.appointment.max_attendees ?? 1)
    .select('id');

  if (claimErr) {
    logger.error({ err: claimErr, entryId: ctx.entry.id }, 'calendar.waitlist.accept.claim_failed');
    return { success: false as const, error: 'Could not claim the spot. Please try again.', code: 'full' as const };
  }
  if (!claimed || claimed.length === 0) {
    return { success: false as const, error: 'This session just filled up.', code: 'full' as const };
  }

  const { error: confirmErr } = await supabase
    .from('booking_waitlists')
    .update({ confirmed: true, booked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', ctx.entry.id);
  if (confirmErr) {
    // Roll the capacity claim back so we don't leak a phantom attendee.
    await supabase
      .from('appointments')
      .update({ current_attendee_count: current })
      .eq('id', ctx.appointment.id)
      .eq('current_attendee_count', current + 1);
    logger.error({ err: confirmErr, entryId: ctx.entry.id }, 'calendar.waitlist.accept.confirm_failed');
    return { success: false as const, error: 'Could not finalise your spot. Please try again.', code: 'full' as const };
  }

  // Confirmation email to the person who just claimed the spot (not the
  // session's original booker) — reuses sendBookingConfirmation with an
  // explicit recipient override.
  try {
    await sendBookingConfirmation(ctx.appointment.id, {
      reason: 'waitlist_promoted',
      attendeeRecordId: ctx.entry.id,
      overrideRecipient: ctx.contact?.email
        ? { email: ctx.contact.email, name: [ctx.contact.first_name, ctx.contact.last_name].filter(Boolean).join(' ') || null }
        : undefined,
    });
  } catch (err) {
    logger.error({ err, appointmentId: ctx.appointment.id }, 'calendar.waitlist.accept.confirmation_email.failed');
  }

  return { success: true as const };
}

/**
 * Public "give up my spot / decline" — frees the offer for the next person.
 * Optional nicety; the offer would expire anyway.
 */
export async function declineWaitlistOffer(token: string) {
  const parsed = parseWaitlistToken(token);
  if (!parsed) return { success: false as const, error: 'This waitlist link is invalid.' };

  const supabase = createAdminClient();
  const { data: entry } = await supabase
    .from('booking_waitlists')
    .select('id, appointment_id, confirmed')
    .eq('id', parsed.waitlistEntryId)
    .maybeSingle();
  if (!entry || entry.confirmed) return { success: false as const, error: 'This offer can no longer be declined.' };

  // Expire this person's offer immediately, then advance.
  await supabase
    .from('booking_waitlists')
    .update({ offer_expires_at: new Date(Date.now() - 1000).toISOString() })
    .eq('id', entry.id);
  await advanceWaitlistForAppointment(entry.appointment_id);
  return { success: true as const };
}

// ---------------------------------------------------------------------------
// Confirmed-attendee self-service. The SAME /book/waitlist/[token] link that
// carried the offer becomes the attendee's permanent manage link once they
// hold a spot (the token is scoped to booking_waitlists.id). The page shows
// their booking + a "cancel my spot" button.
// ---------------------------------------------------------------------------

/** Read-only view of a confirmed attendee's own booking, for the manage page. */
export async function getAttendeeBooking(token: string) {
  const parsed = parseWaitlistToken(token);
  if (!parsed) return { success: false as const, error: 'This link is invalid.' };

  const rec = await getAttendeeRecord(parsed.waitlistEntryId);
  if (!rec || !rec.appointment || !rec.confirmed || rec.cancelled_at) {
    return { success: false as const, error: 'not_confirmed' };
  }

  const tz = rec.appointment.calendar?.timezone || 'UTC';
  const startMs = rec.appointment.start_time ? new Date(rec.appointment.start_time).getTime() : 0;
  const windowHours = rec.appointment.calendar?.cancellation_window_hours ?? 24;
  const cancellable =
    rec.appointment.status !== 'cancelled' &&
    !!startMs &&
    startMs - Date.now() >= windowHours * 60 * 60 * 1000;

  return {
    success: true as const,
    data: {
      title: rec.appointment.title,
      sessionName: rec.appointment.calendar?.name ?? null,
      when: rec.appointment.start_time
        ? `${format(new Date(rec.appointment.start_time), 'EEEE, MMMM d, yyyy · HH:mm')} (${tz})`
        : null,
      meetingLink: rec.appointment.meeting_link,
      firstName: rec.contact?.first_name ?? null,
      sessionCancelled: rec.appointment.status === 'cancelled',
      cancellable,
      cancelWindowHours: windowHours,
    },
  };
}

/** The confirmed attendee cancels their own spot from the manage page. */
export async function cancelAttendeeByToken(token: string) {
  const parsed = parseWaitlistToken(token);
  if (!parsed) return { success: false as const, error: 'This link is invalid.' };
  const res = await cancelAttendeeSpot(parsed.waitlistEntryId);
  if (!res.success) return { success: false as const, error: res.error ?? 'Could not cancel your spot.' };
  return { success: true as const };
}
