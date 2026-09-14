/**
 * Sensible default start time for a day-cell click in BookingModal — never
 * the raw midnight Date CalendarMonthView passes in (date-fns'
 * eachDayOfInterval always generates local-midnight Dates for each cell),
 * which is guaranteed to fail the booking-hours validation the instant it's
 * submitted unchanged.
 *
 * Uses the selected calendar's own `availability` JSONB (already available
 * client-side, no extra round-trip) as a best-effort hint — NOT the full
 * source of truth (that also considers the Availability page's per-day
 * profile, workspace owner resolution, etc., all server-side only). Getting
 * this slightly wrong just means the user adjusts the time before
 * submitting, same as today; the real guarantee stays the server-side
 * validateSlot() check on submit.
 */
export function computeDefaultStartTime(day: Date, calendar: any): string {
  const dayOfWeek = day.getDay(); // 0 (Sun) - 6 (Sat), matches availability JSONB keys
  const slots: { start: string; end: string }[] = calendar?.availability?.[String(dayOfWeek)] || [];

  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const toHHMM = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  if (slots.length === 0) {
    // No configured hours to anchor to — for today, round the current time
    // up to the next 15-minute mark; for any other day, a plain 09:00
    // fallback beats defaulting to "right now" (nonsensical for a future date).
    const today = new Date();
    if (day.toDateString() !== today.toDateString()) return '09:00';
    const nowMinutes = today.getHours() * 60 + today.getMinutes();
    return toHHMM(Math.ceil(nowMinutes / 15) * 15);
  }

  const today = new Date();
  const isToday = day.toDateString() === today.toDateString();
  if (!isToday) {
    // A future day — just open at the day's first configured slot.
    return slots[0].start;
  }

  // Today: round up to the next 15-minute mark, then clamp into the nearest
  // slot that hasn't ended yet. If the day's hours are already over (e.g.
  // clicking today at 7pm on a 9-5 calendar), fall back to the day's
  // opening time rather than defaulting to a time guaranteed to be rejected.
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const roundedNow = Math.ceil(nowMinutes / 15) * 15;
  const openSlot = slots.find((s) => toMinutes(s.end) > roundedNow);
  if (!openSlot) return slots[0].start;
  return roundedNow < toMinutes(openSlot.start) ? openSlot.start : toHHMM(roundedNow);
}
