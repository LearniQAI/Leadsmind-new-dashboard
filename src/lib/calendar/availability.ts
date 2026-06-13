import { addMinutes, format, isAfter, isBefore, parseISO, startOfDay, endOfDay, eachDayOfInterval, setHours, setMinutes } from 'date-fns';
import { createServerClient } from '@/lib/supabase/server';
import { getHolidaysInRange } from './saHolidays';
import { getExternalBusySlots } from './calendarSync';

export interface TimeSlot {
  start: string; // ISO UTC
  end: string;   // ISO UTC
}

export interface DayAvailability {
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
  enabled: boolean;
  slots: { start: string; end: string }[]; // e.g., [{"start": "09:00", "end": "17:00"}]
}

/**
 * Calculates available time slots for a given date range and host availability.
 * Handles buffers, overlapping appointments, overrides, and holiday boundaries.
 */
export async function calculateAvailableSlots({
  startDate,
  endDate,
  workingHours,
  existingAppointments,
  slotDuration,
  bufferBefore = 0,
  bufferAfter = 0,
  minAvailableTime,
  maxAvailableTime,
  overrides = [],
  holidays = []
}: {
  startDate: Date;
  endDate: Date;
  workingHours: DayAvailability[];
  existingAppointments: { start: string; end: string }[];
  slotDuration: number;
  bufferBefore?: number;
  bufferAfter?: number;
  minAvailableTime: Date;
  maxAvailableTime: Date;
  overrides?: any[];
  holidays?: string[];
}): Promise<TimeSlot[]> {
  const allSlots: TimeSlot[] = [];
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  for (const day of days) {
    const dayStr = format(day, 'yyyy-MM-dd');

    // 1. South Africa Public Holiday Check: Block the day
    if (holidays.includes(dayStr)) {
      continue;
    }

    // 2. Override Check
    const dayOverride = overrides.find(o => o.override_date === dayStr);
    let slotsConfig = null;

    if (dayOverride) {
      if (!dayOverride.enabled) {
        // Day is blocked completely
        continue;
      }
      slotsConfig = dayOverride.slots;
    } else {
      const dayOfWeek = day.getDay();
      const config = workingHours.find(h => h.dayOfWeek === dayOfWeek);
      if (!config || !config.enabled) continue;
      slotsConfig = config.slots;
    }

    for (const workSlot of slotsConfig) {
      const [startH, startM] = workSlot.start.split(':').map(Number);
      const [endH, endM] = workSlot.end.split(':').map(Number);

      let currentSlotStart = setMinutes(setHours(startOfDay(day), startH), startM);
      const workEnd = setMinutes(setHours(startOfDay(day), endH), endM);

      while (isBefore(addMinutes(currentSlotStart, slotDuration), workEnd) || 
             addMinutes(currentSlotStart, slotDuration).getTime() === workEnd.getTime()) {
        
        const currentSlotEnd = addMinutes(currentSlotStart, slotDuration);
        
        // Check temporal notice/advance boundaries
        if (isBefore(currentSlotStart, minAvailableTime) || isAfter(currentSlotEnd, maxAvailableTime)) {
          currentSlotStart = addMinutes(currentSlotStart, slotDuration);
          continue;
        }

        // Add buffers for checking conflicts
        const checkStart = addMinutes(currentSlotStart, -bufferBefore);
        const checkEnd = addMinutes(currentSlotEnd, bufferAfter);

        const hasConflict = existingAppointments.some(apt => {
          const aptStart = parseISO(apt.start);
          const aptEnd = parseISO(apt.end);
          return isBefore(aptStart, checkEnd) && isAfter(aptEnd, checkStart);
        });

        if (!hasConflict) {
          allSlots.push({
            start: currentSlotStart.toISOString(),
            end: currentSlotEnd.toISOString()
          });
        }

        currentSlotStart = addMinutes(currentSlotStart, slotDuration);
      }
    }
  }

  return allSlots;
}

/**
 * Collective Availability: Computes the intersection of available slots across multiple hosts.
 */
export function intersectSlots(hostSlotsArrays: TimeSlot[][]): TimeSlot[] {
  if (hostSlotsArrays.length === 0) return [];
  if (hostSlotsArrays.length === 1) return hostSlotsArrays[0];

  let intersection = hostSlotsArrays[0];

  for (let i = 1; i < hostSlotsArrays.length; i++) {
    const currentHostSlots = hostSlotsArrays[i];
    intersection = intersection.filter(slot => 
      currentHostSlots.some(hSlot => 
        hSlot.start === slot.start && hSlot.end === slot.end
      )
    );
  }

  return intersection;
}

export const DEFAULT_WORKING_HOURS: DayAvailability[] = [
  { dayOfWeek: 1, enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  { dayOfWeek: 2, enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  { dayOfWeek: 3, enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  { dayOfWeek: 4, enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  { dayOfWeek: 5, enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  { dayOfWeek: 6, enabled: false, slots: [] },
  { dayOfWeek: 0, enabled: false, slots: [] },
];

/**
 * HIGH-LEVEL ORCHESTRATION: getHostAvailability
 * Fetches all user preferences, internal bookings, external calendars, and SA holidays, compiling the final slots.
 */
export async function getHostAvailability(
  userId: string,
  startStr: string,
  endStr: string,
  slotDuration: number
): Promise<TimeSlot[]> {
  const supabase = await createServerClient();
  
  // 1. Fetch host configurations/profiles
  const { data: profiles } = await supabase
    .from('host_availability_profiles')
    .select('*')
    .eq('user_id', userId);

  // Determine notice rules and buffer rules from the profile or fallback
  const firstProfile = profiles?.[0];
  const bufferTime = firstProfile?.buffer_time ?? 15; // default 15m buffer
  const minimumNoticePeriod = firstProfile?.minimum_notice_period ?? 120; // default 2h notice
  const maximumDaysInAdvance = firstProfile?.maximum_days_in_advance ?? 30; // default 30d ahead

  const workingHours = (profiles && profiles.length > 0)
    ? profiles.map(p => ({
        dayOfWeek: p.day_of_week,
        enabled: p.enabled,
        slots: p.slots
      }))
    : DEFAULT_WORKING_HOURS;

  // 2. Fetch Overrides
  const { data: overrides } = await supabase
    .from('meet_date_overrides')
    .select('*')
    .eq('user_id', userId);

  // 3. Fetch SA Holidays in range
  const holidays = await getHolidaysInRange(userId, startStr.split('T')[0], endStr.split('T')[0]);

  // 4. Compute temporal boundaries
  const now = new Date();
  const minAvailableTime = addMinutes(now, minimumNoticePeriod);
  const maxAvailableTime = addMinutes(now, maximumDaysInAdvance * 1440);

  // 5. Fetch Internal Appointments
  const { data: appointments } = await supabase
    .from('appointments')
    .select('start_time, end_time')
    .eq('user_id', userId)
    .or(`start_time.gte.${startStr},end_time.lte.${endStr}`);

  const internalBookings = (appointments || []).map(a => ({
    start: a.start_time,
    end: a.end_time
  }));

  // 6. Fetch External Busy compiler slots
  const externalBusy = await getExternalBusySlots(userId, startStr, endStr);

  // 7. Aggregate all busy lists
  const aggregateAppointments = [...internalBookings, ...externalBusy];

  // 8. Run calculations
  return calculateAvailableSlots({
    startDate: parseISO(startStr),
    endDate: parseISO(endStr),
    workingHours,
    existingAppointments: aggregateAppointments,
    slotDuration,
    bufferAfter: bufferTime,
    minAvailableTime,
    maxAvailableTime,
    overrides: overrides || [],
    holidays
  });
}
