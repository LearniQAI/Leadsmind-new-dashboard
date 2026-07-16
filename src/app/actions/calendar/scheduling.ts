import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { addMinutes, isWithinInterval, parseISO, addDays } from 'date-fns';
import { getEskomOutages } from '@/lib/calendar/eskomsepush';
import { getHolidaysInRange } from '@/lib/calendar/saHolidays';
import { zonedTimeToUtc, isoDateDayOfWeek, formatInTimeZone } from '@/lib/calendar/timezone';

export async function validateSlot(calendarId: string, startTime: string, endTime: string) {
  const supabase = await createServerClient();
  const start = parseISO(startTime);
  const end = parseISO(endTime);
  const dateStr = startTime.split('T')[0];

  const available = await getAvailableSlots(calendarId, dateStr);
  const isStillAvailable = available.some(s => s.start === startTime);

  if (!isStillAvailable) {
    return { available: false, reason: 'Slot is not available or falls within load-shedding/override blocks.' };
  }
  return { available: true };
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
