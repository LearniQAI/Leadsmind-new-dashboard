import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { addMinutes, isWithinInterval, parseISO, addDays } from 'date-fns';
import { getEskomOutages, type OutagePeriod } from '@/lib/calendar/eskomsepush';
import { getHolidaysInRange } from '@/lib/calendar/saHolidays';
import { zonedTimeToUtc, isoDateDayOfWeek, formatInTimeZone } from '@/lib/calendar/timezone';

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

/**
 * Equitable Round Robin Selection: Pick rep with lowest bookings and oldest assignment.
 */
export async function getRoundRobinAssignee(calendarId: string, workspaceId: string) {
  const supabase = createAdminClient();

  const { data: members, error } = await supabase
    .from('round_robin_assignment')
    .select('user_id, weight, booking_count')
    .eq('calendar_id', calendarId)
    .eq('workspace_id', workspaceId)
    .order('booking_count', { ascending: true })
    .order('last_assigned_at', { ascending: true, nullsFirst: true });

  if (error || !members || members.length === 0) {
    throw new Error('No team members assigned to this Round Robin calendar');
  }

  // Pick the rep with the lowest current booking count
  return members[0].user_id;
}

export async function updateRoundRobinStats(calendarId: string, userId: string) {
  const supabase = createAdminClient();
  const { data: member } = await supabase
    .from('round_robin_assignment')
    .select('booking_count')
    .eq('calendar_id', calendarId)
    .eq('user_id', userId)
    .single();

  const count = (member?.booking_count || 0) + 1;

  await supabase
    .from('round_robin_assignment')
    .update({ 
      booking_count: count,
      last_assigned_at: new Date().toISOString()
    })
    .eq('calendar_id', calendarId)
    .eq('user_id', userId);
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

  const { data: existing } = await supabase
    .from('appointments')
    .select('start_time, end_time')
    .eq('calendar_id', calendarId)
    .eq('status', 'scheduled')
    .gte('start_time', startOfDayStr)
    .lte('start_time', endOfDayStr);

  const bookedIntervals = (existing || []).map(a => ({
    start: parseISO(a.start_time),
    end: parseISO(a.end_time)
  }));

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

      if (!isBooked && !isLeased && !isLoadShedding) {
        slots.push({
          start: current.toISOString(),
          end: slotEnd.toISOString(),
          timeLabel: formatInTimeZone(current, calendarTimeZone)
        });
      }
      current = addMinutes(current, duration);
    }
  }

  return slots;
}
