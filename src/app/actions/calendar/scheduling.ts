'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { addMinutes, isWithinInterval, parseISO, addDays } from 'date-fns';
import { getEskomOutages, type OutagePeriod } from '@/lib/calendar/eskomsepush';
import { getHolidaysInRange } from '@/lib/calendar/saHolidays';
import { zonedTimeToUtc, isoDateDayOfWeek, formatInTimeZone } from '@/lib/calendar/timezone';
import { getExternalBusySlots } from '@/lib/calendar/calendarSync';
import { logger } from '@/shared/logger';

/**
 * Resolves the host user whose connected external calendar (Google/Outlook)
 * should be consulted for this booking calendar. Round-robin calendars use
 * the first assignment member; personal/collective fall back to the workspace
 * owner (booking_calendars has no per-calendar owner column). Returns null if
 * nothing resolvable — external busy is then simply skipped.
 */
async function resolveHostUserId(supabase: any, calendar: any, calendarId: string): Promise<string | null> {
  const { data: rr } = await supabase
    .from('round_robin_assignment')
    .select('user_id')
    .eq('calendar_id', calendarId)
    .limit(1)
    .maybeSingle();
  if (rr?.user_id) return rr.user_id;

  const { data: ws } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', calendar.workspace_id)
    .maybeSingle();
  return ws?.owner_id ?? null;
}

/**
 * External-calendar busy intervals for a host, over [startIso, endIso].
 * Wrapped so a provider/API failure can never break slot computation — the
 * internal availability model stays authoritative; external busy is additive.
 */
async function getExternalBusyIntervals(
  supabase: any,
  calendar: any,
  calendarId: string,
  startIso: string,
  endIso: string
): Promise<{ start: Date; end: Date }[]> {
  try {
    const hostUserId = await resolveHostUserId(supabase, calendar, calendarId);
    if (!hostUserId) return [];
    const busy = await getExternalBusySlots(hostUserId, startIso, endIso);
    return busy.map((b) => ({ start: parseISO(b.start), end: parseISO(b.end) }));
  } catch (err) {
    logger.warn({ err, calendarId }, 'calendar.available_slots.external_busy.failed');
    return [];
  }
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export async function validateSlot(calendarId: string, startTime: string, endTime: string) {
  const dateStr = startTime.split('T')[0];

  const available = await getAvailableSlots(calendarId, dateStr);
  const isStillAvailable = available.some(s => s.start === startTime);

  if (!isStillAvailable) {
    const diagnosis = await diagnoseSlotUnavailable(calendarId, startTime, endTime);
    return { available: false, reason: diagnosis.message, reasonCode: diagnosis.code };
  }
  return { available: true };
}

/**
 * Re-runs the same gating checks getAvailableSlots uses, targeted at one
 * specific requested start/end, so a rejected slot gets an accurate,
 * specific reason instead of the single ambiguous "not available or
 * load-shedding" message that used to cover every rejection cause.
 */
async function diagnoseSlotUnavailable(calendarId: string, startTime: string, endTime: string) {
  const supabase = createAdminClient();
  const start = parseISO(startTime);
  const end = parseISO(endTime);
  const dateStr = startTime.split('T')[0];

  const { data: calendar } = await supabase.from('booking_calendars').select('*').eq('id', calendarId).single();
  
  // Resource conflict check (Rooms, Desks, Equipment)
  // If the user requested a specific resource for this slot, make sure no other appointment is using it
  // at this exact time across the entire workspace (Task 71)
  /* 
  if (requestedResourceId) {
    const { count } = await supabase.from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('resource_id', requestedResourceId)
      .in('status', ['confirmed', 'scheduled'])
      .or(`and(start_time.lte.${start.toISOString()},end_time.gt.${start.toISOString()}),and(start_time.lt.${end.toISOString()},end_time.gte.${end.toISOString()})`);
    
    if (count && count > 0) return { code: 'resource_conflict', message: 'The requested room or resource is already booked for this time.' };
  }
  */
  if (!calendar) {
    return { code: 'calendar_not_found' as const, message: 'This calendar no longer exists or is unavailable.' };
  }

  const { data: rrMember } = await supabase
    .from('round_robin_assignment')
    .select('user_id')
    .eq('calendar_id', calendarId)
    .limit(1)
    .maybeSingle();
  const userId = rrMember?.user_id || calendar.workspace_id;

  const { data: profile } = await supabase
    .from('host_availability_profiles')
    .select('*')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  const bufferTime = profile?.buffer_time ?? calendar.buffer_time ?? 15;
  const minimumNoticePeriod = profile?.minimum_notice_period ?? 120;
  const maximumDaysInAdvance = profile?.maximum_days_in_advance ?? 30;

  const now = new Date();
  const minAvailableTime = addMinutes(now, minimumNoticePeriod);
  const maxAvailableTime = addDays(now, maximumDaysInAdvance);
  const targetDate = parseISO(dateStr);

  if (targetDate > maxAvailableTime || targetDate < addDays(now, -1)) {
    return { code: 'outside_booking_horizon' as const, message: 'This date is outside the allowed booking window.' };
  }

  const holidays = await getHolidaysInRange(userId, dateStr, dateStr);
  if (holidays.includes(dateStr)) {
    return { code: 'public_holiday' as const, message: 'This date is a public holiday and is closed for bookings.' };
  }

  const { data: overrides } = await supabase
    .from('meet_date_overrides')
    .select('*')
    .eq('user_id', userId)
    .eq('override_date', dateStr)
    .maybeSingle();

  if (overrides && !overrides.enabled) {
    return { code: 'day_blocked_by_override' as const, message: 'This date has been manually blocked and is closed for bookings.' };
  }

  let daySlots: any[] = [];
  if (overrides && overrides.enabled && overrides.slots) {
    daySlots = overrides.slots;
  } else {
    const dayOfWeek = isoDateDayOfWeek(dateStr);
    daySlots = calendar.availability?.[dayOfWeek.toString()] || [];
    if (daySlots.length === 0 && dayOfWeek >= 1 && dayOfWeek <= 5) {
      daySlots = [{ start: '09:00', end: '17:00' }];
    }
  }

  if (daySlots.length === 0) {
    return { code: 'no_hours_configured' as const, message: 'No booking hours are configured for this day.' };
  }

  const calendarTimeZone = calendar.timezone || 'UTC';
  const withinConfiguredHours = daySlots.some((slot: any) => {
    const slotStart = zonedTimeToUtc(dateStr, slot.start, calendarTimeZone);
    const slotEnd = zonedTimeToUtc(dateStr, slot.end, calendarTimeZone);
    return start >= slotStart && end <= slotEnd;
  });
  if (!withinConfiguredHours) {
    return { code: 'outside_configured_hours' as const, message: 'This time falls outside the configured booking hours for this day.' };
  }

  if (start < minAvailableTime) {
    return {
      code: 'before_minimum_notice' as const,
      message: `This time is within the required ${minimumNoticePeriod}-minute minimum notice period.`,
    };
  }

  const { data: existing } = await supabase
    .from('appointments')
    .select('start_time, end_time')
    .eq('calendar_id', calendarId)
    .eq('status', 'scheduled')
    .gte('start_time', `${dateStr}T00:00:00Z`)
    .lte('start_time', `${dateStr}T23:59:59Z`);

  const isBooked = (existing || []).some((a: any) => {
    const btStart = parseISO(a.start_time);
    const btEnd = parseISO(a.end_time);
    const bufferedStart = addMinutes(btStart, -bufferTime);
    const bufferedEnd = addMinutes(btEnd, bufferTime);
    return (start >= bufferedStart && start < bufferedEnd) || (end > bufferedStart && end <= bufferedEnd);
  });
  if (isBooked) {
    return { code: 'existing_booking_conflict' as const, message: 'This time conflicts with an existing booking.' };
  }

  const { data: activeLeases } = await supabase
    .from('booking_leases')
    .select('slot_time')
    .eq('calendar_id', calendarId)
    .or(`status.eq.confirmed,and(status.eq.holding,expires_at.gt.${now.toISOString()})`);

  const isLeased = (activeLeases || []).some((l: any) => parseISO(l.slot_time).getTime() === start.getTime());
  if (isLeased) {
    return { code: 'existing_booking_conflict' as const, message: 'This time conflicts with an existing checkout in progress for that slot.' };
  }

  const externalBusy = await getExternalBusyIntervals(supabase, calendar, calendarId, `${dateStr}T00:00:00Z`, `${dateStr}T23:59:59Z`);
  if (externalBusy.some((bt) => overlaps(start, end, bt.start, bt.end))) {
    return { code: 'external_calendar_conflict' as const, message: "This time is blocked by an event on the host's connected calendar." };
  }

  let outages: OutagePeriod[] = [];
  const { data: hostUser } = await supabase.from('users').select('eskom_suburb_id').eq('id', userId).maybeSingle();
  if (hostUser?.eskom_suburb_id) {
    outages = await getEskomOutages(hostUser.eskom_suburb_id, parseISO(`${dateStr}T00:00:00Z`), parseISO(`${dateStr}T23:59:59Z`));
  }

  const isLoadShedding = outages.some(outage => {
    const outageStart = parseISO(outage.start);
    const outageEnd = parseISO(outage.end);
    return (start >= outageStart && start < outageEnd) || (end > outageStart && end <= outageEnd);
  });
  if (isLoadShedding) {
    return { code: 'load_shedding_block' as const, message: 'This time falls within a scheduled load-shedding (power outage) block.' };
  }

  return { code: 'unknown' as const, message: 'This slot is no longer available.' };
}

const RR_NO_MEMBERS = 'No team members assigned to this Round Robin calendar';

/**
 * Equitable round-robin host selection for a booking calendar's enrolled pool
 * (round_robin_assignment rows — written by the "Manage team" UI, Task 64).
 *
 * Picks the host with the lowest booking_count; ties broken by least-recently
 * assigned, then earliest enrolled (so a brand-new pool where every count is 0
 * still assigns deterministically to the first-enrolled host, then rotates).
 *
 * Pick + increment happen in ONE guarded UPDATE (optimistic lock on
 * booking_count), so two near-simultaneous bookings can't both land on the
 * same host — the loser retries and the re-sort hands it a different host.
 *
 * Throws RR_NO_MEMBERS when the pool is empty — callers decide the fallback
 * (public/portal leave the booking unassigned; the internal booking modal
 * surfaces the error so an admin enrols hosts).
 */
export async function getRoundRobinAssignee(calendarId: string, workspaceId: string): Promise<string> {
  const supabase = createAdminClient();

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: members, error } = await supabase
      .from('round_robin_assignment')
      .select('id, user_id, booking_count')
      .eq('calendar_id', calendarId)
      .eq('workspace_id', workspaceId)
      .order('booking_count', { ascending: true })
      .order('last_assigned_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) throw error;
    if (!members || members.length === 0) throw new Error(RR_NO_MEMBERS);

    const pick = members[0];
    const currentCount = pick.booking_count ?? 0;

    // Claim this row only if booking_count is still what we just read.
    const { data: claimed } = await supabase
      .from('round_robin_assignment')
      .update({ booking_count: currentCount + 1, last_assigned_at: new Date().toISOString() })
      .eq('id', pick.id)
      .eq('booking_count', currentCount)
      .select('user_id');

    if (claimed && claimed.length === 1) return claimed[0].user_id;
    // else: another booking claimed it first — retry with a fresh sort
  }

  // Highly contended (5 losing retries): fall back to an unguarded lowest-count
  // pick + increment rather than failing the booking outright.
  const { data: fallback } = await supabase
    .from('round_robin_assignment')
    .select('id, user_id, booking_count')
    .eq('calendar_id', calendarId)
    .eq('workspace_id', workspaceId)
    .order('booking_count', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1);

  if (fallback && fallback.length === 1) {
    await supabase
      .from('round_robin_assignment')
      .update({ booking_count: (fallback[0].booking_count ?? 0) + 1, last_assigned_at: new Date().toISOString() })
      .eq('id', fallback[0].id);
    return fallback[0].user_id;
  }
  throw new Error(RR_NO_MEMBERS);
}

/**
 * @deprecated The booking-count increment is now atomic inside
 * getRoundRobinAssignee(). Kept as a no-op so a stale caller can never
 * double-count a host.
 */
export async function updateRoundRobinStats(_calendarId: string, _userId: string): Promise<void> {
  /* no-op — see getRoundRobinAssignee */
}

export async function validateCollectiveSlot(calendarId: string, startTime: string, endTime: string) {
  return validateSlot(calendarId, startTime, endTime);
}

/**
 * Computes available slots for a given date.
 * Integrates: notice periods, buffer time, date overrides, SA public holidays, load shedding schedules, and slot leases.
 */
export async function getAvailableSlots(calendarId: string, date: string) {
  const supabase = createAdminClient();
  
  // 1. Fetch Calendar details
  const { data: calendar } = await supabase
    .from('booking_calendars')
    .select('*')
    .eq('id', calendarId)
    .single();

  if (!calendar) return [];

  // 2. Fetch Host Profile rules and settings (notice periods & buffer time)
  // Check if calendar is assigned to a user or uses Round Robin
  let hostId = calendar.workspace_id; // fallback
  
  // Retrieve the assignee if round-robin or custom personal calendar
  const { data: rrMember } = await supabase
    .from('round_robin_assignment')
    .select('user_id')
    .eq('calendar_id', calendarId)
    .limit(1)
    .maybeSingle();

  const userId = rrMember?.user_id || calendar.workspace_id;

  const { data: profile } = await supabase
    .from('host_availability_profiles')
    .select('*')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  const bufferTime = profile?.buffer_time ?? calendar.buffer_time ?? 15;
  const minimumNoticePeriod = profile?.minimum_notice_period ?? 120;
  const maximumDaysInAdvance = profile?.maximum_days_in_advance ?? 30;

  // 3. Compute temporal boundaries
  const now = new Date();
  const minAvailableTime = addMinutes(now, minimumNoticePeriod);
  const maxAvailableTime = addDays(now, maximumDaysInAdvance);

  // Check if requested date is within horizon range
  const targetDate = parseISO(date);
  if (targetDate > maxAvailableTime || targetDate < addDays(now, -1)) {
    return [];
  }

  // 4. Fetch SA public holidays and overrides
  const holidays = await getHolidaysInRange(userId, date, date);
  if (holidays.includes(date)) {
    return []; // Completely closed on public holidays
  }

  const { data: overrides } = await supabase
    .from('meet_date_overrides')
    .select('*')
    .eq('user_id', userId)
    .eq('override_date', date)
    .maybeSingle();

  if (overrides && !overrides.enabled) {
    return []; // Blocked override day
  }

  // 5. Build base operational hours slots configuration
  let daySlots = [];
  if (overrides && overrides.enabled && overrides.slots) {
    daySlots = overrides.slots;
  } else {
    // Computed from the plain date string, not the server's local
    // interpretation of a Date object — avoids day-of-week drift when the
    // server process timezone differs from UTC.
    const dayOfWeek = isoDateDayOfWeek(date);
    daySlots = calendar.availability?.[dayOfWeek.toString()] || [];
    if (daySlots.length === 0 && dayOfWeek >= 1 && dayOfWeek <= 5) {
      daySlots = [{ start: '09:00', end: '17:00' }]; // fallback weekday
    }
  }

  if (daySlots.length === 0) return [];

  // 6. Retrieve active bookings (internal appointments)
  const startOfDayStr = `${date}T00:00:00Z`;
  const endOfDayStr = `${date}T23:59:59Z`;

  // Group-session (class_booking) calendars: a slot with an existing session is
  // NOT blocked — it stays bookable until it's at capacity, then it's a
  // "join waitlist" slot. Every other calendar type: an existing appointment
  // blocks the slot (1:1).
  const isClass = calendar.calendar_type === 'class_booking';

  const { data: existing } = await supabase
    .from('appointments')
    .select(isClass ? 'id, start_time, end_time, max_attendees, current_attendee_count, waitlist_enabled' : 'start_time, end_time')
    .eq('calendar_id', calendarId)
    .eq('status', 'scheduled')
    .gte('start_time', startOfDayStr)
    .lte('start_time', endOfDayStr);

  const bookedIntervals = isClass
    ? []
    : (existing || []).map(a => ({ start: parseISO((a as any).start_time), end: parseISO((a as any).end_time) }));

  const sessionByStart = new Map<number, any>(
    isClass ? (existing || []).map((s: any) => [parseISO(s.start_time).getTime(), s]) : []
  );

  // 7. Retrieve active PayFast checkout leases (5-min holds)
  const { data: activeLeases } = await supabase
    .from('booking_leases')
    .select('slot_time')
    .eq('calendar_id', calendarId)
    .or(`status.eq.confirmed,and(status.eq.holding,expires_at.gt.${now.toISOString()})`);

  const leasedTimes = (activeLeases || []).map(l => parseISO(l.slot_time).getTime());

  // 8. Fetch EskomSePush Outages for Host's physical office location
  let outages: any[] = [];
  const { data: hostUser } = await supabase
    .from('users')
    .select('eskom_suburb_id')
    .eq('id', userId)
    .maybeSingle();

  if (hostUser?.eskom_suburb_id) {
    outages = await getEskomOutages(
      hostUser.eskom_suburb_id,
      parseISO(startOfDayStr),
      parseISO(endOfDayStr)
    );
  }

  // 8b. External calendar (Google / Outlook) busy times for the host — Task 62.
  // A connected calendar's real events remove slots from this booking page.
  const externalBusyIntervals = await getExternalBusyIntervals(
    supabase,
    calendar,
    calendarId,
    startOfDayStr,
    endOfDayStr
  );

  // 9. Process Slots Chunking
  const slots = [];
  const duration = calendar.slot_duration || 30;

  const calendarTimeZone = calendar.timezone || 'UTC';

  for (const slot of daySlots) {
    // "09:00"-"17:00" are wall-clock times in the workspace's configured
    // calendar timezone, not the server process's timezone — interpreting
    // them with setHours()/setMinutes() on a Date silently used whatever
    // timezone the server happened to be running in (UTC on Vercel),
    // shifting every business-hours slot by the workspace's UTC offset.
    let current = zonedTimeToUtc(date, slot.start, calendarTimeZone);
    const end = zonedTimeToUtc(date, slot.end, calendarTimeZone);

    while (addMinutes(current, duration) <= end) {
      const slotEnd = addMinutes(current, duration);

      // Check minimum notice period
      if (current < minAvailableTime) {
        current = addMinutes(current, duration);
        continue;
      }

      // Check if this slot overlaps with active leases
      const isLeased = leasedTimes.includes(current.getTime());

      // Check if slot overlaps with booked appointments (including buffer time)
      const isBooked = bookedIntervals.some(bt => {
        const bufferedStart = addMinutes(bt.start, -bufferTime);
        const bufferedEnd = addMinutes(bt.end, bufferTime);
        return (current >= bufferedStart && current < bufferedEnd) || 
               (slotEnd > bufferedStart && slotEnd <= bufferedEnd);
      });

      // Check if slot overlaps with loadshedding grid blackouts
      const isLoadShedding = outages.some(outage => {
        const outageStart = parseISO(outage.start);
        const outageEnd = parseISO(outage.end);
        return (current >= outageStart && current < outageEnd) ||
               (slotEnd > outageStart && slotEnd <= outageEnd);
      });

      // Check if slot overlaps a busy block on the host's connected external calendar
      const isExternallyBusy = externalBusyIntervals.some(bt =>
        overlaps(current, slotEnd, bt.start, bt.end)
      );

      if (!isBooked && !isLeased && !isLoadShedding && !isExternallyBusy) {
        const base = {
          start: current.toISOString(),
          end: slotEnd.toISOString(),
          timeLabel: formatInTimeZone(current, calendarTimeZone),
        };
        if (isClass) {
          const session = sessionByStart.get(current.getTime());
          const capacity = session?.max_attendees ?? calendar.capacity ?? 1;
          const taken = session?.current_attendee_count ?? 0;
          const waitlistEnabled = session ? !!session.waitlist_enabled : !!calendar.waitlist_enabled;
          const full = taken >= capacity;
          // A full session with no waitlist is dead — don't show it at all.
          if (full && !waitlistEnabled) {
            current = addMinutes(current, duration);
            continue;
          }
          slots.push({
            ...base,
            appointmentId: session?.id ?? null,
            capacity,
            spotsLeft: Math.max(0, capacity - taken),
            full,
            waitlistEnabled,
          });
        } else {
          slots.push(base);
        }
      }
      current = addMinutes(current, duration);
    }
  }

  return slots;
}
