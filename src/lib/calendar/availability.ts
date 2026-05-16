import { addMinutes, format, isAfter, isBefore, parseISO, startOfDay, endOfDay, eachDayOfInterval, setHours, setMinutes } from 'date-fns';
import { createServerClient } from '@/lib/supabase/server';

export interface TimeSlot {
  start: string; // ISO UTC
  end: string;   // ISO UTC
}

export interface DayAvailability {
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
  enabled: boolean;
  slots: { start: string; end: string }[]; // e.g., ["09:00", "17:00"]
}

/**
 * Calculates available time slots for a given date range and host availability.
 * Handles buffers, overlapping appointments, and slot duration.
 */
export async function calculateAvailableSlots({
  startDate,
  endDate,
  workingHours,
  existingAppointments,
  slotDuration,
  bufferBefore = 0,
  bufferAfter = 0
}: {
  startDate: Date;
  endDate: Date;
  workingHours: DayAvailability[];
  existingAppointments: { start: string; end: string }[];
  slotDuration: number;
  bufferBefore?: number;
  bufferAfter?: number;
}): Promise<TimeSlot[]> {
  const allSlots: TimeSlot[] = [];
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  for (const day of days) {
    const dayOfWeek = day.getDay();
    const config = workingHours.find(h => h.dayOfWeek === dayOfWeek);

    if (!config || !config.enabled) continue;

    for (const workSlot of config.slots) {
      const [startH, startM] = workSlot.start.split(':').map(Number);
      const [endH, endM] = workSlot.end.split(':').map(Number);

      let currentSlotStart = setMinutes(setHours(startOfDay(day), startH), startM);
      const workEnd = setMinutes(setHours(startOfDay(day), endH), endM);

      while (isBefore(addMinutes(currentSlotStart, slotDuration), workEnd) || 
             addMinutes(currentSlotStart, slotDuration).getTime() === workEnd.getTime()) {
        
        const currentSlotEnd = addMinutes(currentSlotStart, slotDuration);
        
        // Add buffers for checking conflicts
        const checkStart = addMinutes(currentSlotStart, -bufferBefore);
        const checkEnd = addMinutes(currentSlotEnd, bufferAfter);

        const hasConflict = existingAppointments.some(apt => {
          const aptStart = parseISO(apt.start);
          const aptEnd = parseISO(apt.end);
          
          // Overlap logic: (StartA < EndB) and (EndA > StartB)
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
 * Available Slots = HostA ∩ HostB ∩ HostC
 */
export function intersectSlots(hostSlotsArrays: TimeSlot[][]): TimeSlot[] {
  if (hostSlotsArrays.length === 0) return [];
  if (hostSlotsArrays.length === 1) return hostSlotsArrays[0];

  // Start with the first host's slots
  let intersection = hostSlotsArrays[0];

  // Intersect with each subsequent host
  for (let i = 1; i < hostSlotsArrays.length; i++) {
    const currentHostSlots = hostSlotsArrays[i];
    
    // A slot is available collectively only if it exists in ALL hosts' availability arrays
    intersection = intersection.filter(slot => 
      currentHostSlots.some(hSlot => 
        hSlot.start === slot.start && hSlot.end === slot.end
      )
    );
  }

  return intersection;
}

/**
 * Helper to generate a default 9-5 working hours template
 */
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
 * Fetches all necessary data from the database and computes available slots for a specific host.
 */
export async function getHostAvailability(
  userId: string,
  startStr: string,
  endStr: string,
  slotDuration: number
): Promise<TimeSlot[]> {
  const supabase = await createServerClient();
  
  // 1. Fetch Existing Appointments for the host in the range
  const { data: appointments } = await supabase
    .from('appointments')
    .select('start_time, end_time')
    .eq('host_id', userId)
    .or(`start_time.gte.${startStr},end_time.lte.${endStr}`);

  // 2. TODO: Fetch actual host working hours from a 'user_availability' table
  // For now, we fallback to the premium 9-5 template
  const workingHours = DEFAULT_WORKING_HOURS;

  // 3. Orchestrate the arithmetic calculation
  return calculateAvailableSlots({
    startDate: parseISO(startStr),
    endDate: parseISO(endStr),
    workingHours,
    existingAppointments: (appointments || []).map(a => ({ start: a.start_time, end: a.end_time })),
    slotDuration
  });
}
