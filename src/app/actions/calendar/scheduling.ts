'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { 
  addMinutes, 
  isWithinInterval, 
  parseISO, 
  format, 
  getDay, 
  setHours, 
  setMinutes 
} from 'date-fns';

/**
 * Validates if a requested slot is available on a personal calendar.
 */
export async function validateSlot(calendarId: string, startTime: string, endTime: string) {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();

  // 1. Fetch Calendar Settings
  const { data: calendar, error: calError } = await supabase
    .from('booking_calendars')
    .select('*')
    .eq('id', calendarId)
    .single();

  if (calError || !calendar) throw new Error('Calendar not found');

  const start = parseISO(startTime);
  const end = parseISO(endTime);
  const dayOfWeek = getDay(start); // 0 (Sun) to 6 (Sat)

  // 2. Check Availability (Schema: {"0": [{"start": "09:00", "end": "17:00"}]})
  const availability = calendar.availability || {};
  let daySlots = availability[dayOfWeek.toString()] || [];

  // Fallback: If no slots are configured for a weekday (1-5), assume 9 AM - 5 PM
  if (daySlots.length === 0 && dayOfWeek >= 1 && dayOfWeek <= 5) {
    daySlots = [{ start: '09:00', end: '17:00' }];
  }

  if (daySlots.length === 0) return { available: false, reason: 'This day is marked as closed on the calendar' };

  const isWithinAvailability = daySlots.some((slot: any) => {
    const [sH, sM] = slot.start.split(':').map(Number);
    const [eH, eM] = slot.end.split(':').map(Number);
    
    const slotStart = setMinutes(setHours(start, sH), sM);
    const slotEnd = setMinutes(setHours(start, eH), eM);

    return start >= slotStart && end <= slotEnd;
  });

  if (!isWithinAvailability) return { available: false, reason: 'Outside of business hours' };

  // 3. Check Overlaps & Capacity
  const { data: appointments, error: aptError } = await supabase
    .from('appointments')
    .select('start_time, end_time')
    .eq('calendar_id', calendarId)
    .eq('status', 'scheduled')
    .gte('start_time', startOfDay(start).toISOString())
    .lte('start_time', endOfDay(start).toISOString());

  if (aptError) throw aptError;

  // Type-specific validation
  if (calendar.calendar_type === 'class_booking') {
    // For classes, we check if the EXACT slot is full
    const existingAtSlot = appointments.filter(a => a.start_time === startTime).length;
    if (existingAtSlot >= (calendar.capacity || 1)) {
      return { available: false, reason: 'This class session is fully booked' };
    }
  } else {
    // For personal/RR, we check for ANY overlap
    const buffer = calendar.buffer_time || 0;
    for (const appt of appointments) {
      const apptStart = parseISO(appt.start_time);
      const apptEnd = parseISO(appt.end_time);

      const intervalStart = subMinutes(apptStart, buffer);
      const intervalEnd = addMinutes(apptEnd, buffer);

      if (
        isWithinInterval(start, { start: intervalStart, end: intervalEnd }) ||
        isWithinInterval(end, { start: intervalStart, end: intervalEnd })
      ) {
        return { available: false, reason: 'Slot overlaps with existing appointment or buffer' };
      }
    }
  }

  return { available: true };
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function subMinutes(date: Date, minutes: number) {
  return addMinutes(date, -minutes);
}

/**
 * Round Robin Logic: Selects the best assignee based on booking counts and weights.
 */
export async function getRoundRobinAssignee(calendarId: string, workspaceId: string) {
  const supabase = await createServerClient();

  // 1. Fetch all assigned members
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

  // 2. Basic distribution: Return the one with lowest count
  // In a more advanced version, we would check their personal calendar availability here
  return members[0].user_id;
}

/**
 * Updates the booking count and last_assigned_at for a RR member.
 */
export async function updateRoundRobinStats(calendarId: string, userId: string) {
  const supabase = await createServerClient();
  await supabase.rpc('fn_increment_rr_stats', { 
    p_calendar_id: calendarId, 
    p_user_id: userId 
  });
}

/**
 * Collective Logic: Validates if ALL participants are available.
 */
export async function validateCollectiveSlot(calendarId: string, startTime: string, endTime: string) {
    // Logic to check multiple user calendars simultaneously
    // For Sprint 3, we'll start with basic workspace-level overlap check for the specific calendar
    return validateSlot(calendarId, startTime, endTime);
}

/**
 * Generates available slots for a specific date
 */
export async function getAvailableSlots(calendarId: string, date: string) {
    const supabase = createAdminClient();
    const { data: calendar } = await supabase
        .from('booking_calendars')
        .select('*')
        .eq('id', calendarId)
        .single();

    if (!calendar) return [];

    const startOfDayStr = `${date}T00:00:00Z`;
    const endOfDayStr = `${date}T23:59:59Z`;

    // 1. Get business hours for this day
    const dayOfWeek = getDay(parseISO(date));
    let daySlots = calendar.availability?.[dayOfWeek.toString()] || [];
    
    // Fallback: 9-5 for weekdays
    if (daySlots.length === 0 && dayOfWeek >= 1 && dayOfWeek <= 5) {
        daySlots = [{ start: '09:00', end: '17:00' }];
    }

    if (daySlots.length === 0) return [];

    // 2. Fetch existing appointments to block slots
    const { data: existing } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('calendar_id', calendarId)
        .eq('status', 'scheduled')
        .gte('start_time', startOfDayStr)
        .lte('start_time', endOfDayStr);

    const bookedTimes = (existing || []).map(a => ({
        start: parseISO(a.start_time),
        end: parseISO(a.end_time)
    }));

    // 3. Chunk availability into slots
    const slots = [];
    const duration = calendar.slot_duration || 30;

    for (const slot of daySlots) {
        const [sH, sM] = slot.start.split(':').map(Number);
        const [eH, eM] = slot.end.split(':').map(Number);
        
        let current = setMinutes(setHours(parseISO(date), sH), sM);
        const end = setMinutes(setHours(parseISO(date), eH), eM);

        while (addMinutes(current, duration) <= end) {
            const slotEnd = addMinutes(current, duration);
            
            // Check if this slot overlaps with any booked time
            const isBooked = bookedTimes.some(bt => 
                (current >= bt.start && current < bt.end) || 
                (slotEnd > bt.start && slotEnd <= bt.end)
            );

            if (!isBooked) {
                slots.push({
                    start: current.toISOString(),
                    end: slotEnd.toISOString(),
                    timeLabel: format(current, 'h:mm a')
                });
            }
            current = addMinutes(current, duration);
        }
    }

    return slots;
}
