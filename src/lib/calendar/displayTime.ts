/**
 * Display helpers that render an appointment in ITS CALENDAR'S timezone — never the viewer's browser
 * timezone — so a booking reads the same for everyone (a Karachi browser looking at a UTC or
 * Johannesburg calendar sees that calendar's wall-clock times, with the zone named next to them).
 *
 * Pure Intl, no dependencies, safe on client and server. An appointment's zone is, in order:
 * the joined calendar's `timezone`, the `metadata.booking_timezone` stamped at booking time, then —
 * only for rows that have no calendar at all (e.g. Instant Meet) — the browser zone, flagged as a
 * fallback so callers can say so.
 */

export interface ApptZone {
  timeZone: string;
  /** true only when no calendar/booking zone exists and the browser zone was used. */
  isBrowserFallback: boolean;
}

function validZone(tz: unknown): string | null {
  if (typeof tz !== 'string' || !tz) return null;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

export function apptZone(appt: any): ApptZone {
  const tz = validZone(appt?.calendar?.timezone) ?? validZone(appt?.metadata?.booking_timezone);
  if (tz) return { timeZone: tz, isBrowserFallback: false };
  return { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', isBrowserFallback: true };
}

export function safeZone(tz: string | null | undefined): string {
  return validZone(tz) ?? 'UTC';
}

export interface WallClock {
  /** 'yyyy-MM-dd' as seen on the zone's wall clock */
  date: string;
  hour: number;
  minute: number;
}

export function wallClock(instant: string | Date, timeZone: string): WallClock {
  const d = typeof instant === 'string' ? new Date(instant) : instant;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: safeZone(timeZone),
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
  };
}

/** 'yyyy-MM-dd' of the instant in the zone — the day cell it belongs to. */
export const dayKeyInZone = (instant: string | Date, timeZone: string) => wallClock(instant, timeZone).date;

/** '3:30 PM' */
export function formatTime12(instant: string | Date, timeZone: string): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant;
  return new Intl.DateTimeFormat('en-US', { timeZone: safeZone(timeZone), hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
}

/** '15:30' */
export function formatTime24(instant: string | Date, timeZone: string): string {
  const w = wallClock(instant, timeZone);
  return `${String(w.hour).padStart(2, '0')}:${String(w.minute).padStart(2, '0')}`;
}

/** 'Oct 4, 2026' */
export function formatDateShort(instant: string | Date, timeZone: string): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant;
  return new Intl.DateTimeFormat('en-US', { timeZone: safeZone(timeZone), month: 'short', day: 'numeric', year: 'numeric' }).format(d);
}

/** 'Sunday, October 4, 2026' */
export function formatDateLong(instant: string | Date, timeZone: string): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant;
  return new Intl.DateTimeFormat('en-US', { timeZone: safeZone(timeZone), weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(d);
}

/** Compact zone label at that instant: 'UTC', 'GMT+2', 'GMT+5' (DST-correct for the date). */
export function tzShort(timeZone: string, at: string | Date = new Date()): string {
  const d = typeof at === 'string' ? new Date(at) : at;
  const name = new Intl.DateTimeFormat('en-US', { timeZone: safeZone(timeZone), timeZoneName: 'short' })
    .formatToParts(d)
    .find((p) => p.type === 'timeZoneName')?.value;
  return name || safeZone(timeZone);
}

/** Full label: 'Africa/Johannesburg (GMT+2)'. */
export function tzLabel(timeZone: string, at: string | Date = new Date()): string {
  const tz = safeZone(timeZone);
  const short = tzShort(tz, at);
  return short === tz ? tz : `${tz} (${short})`;
}

/** '3:30 PM – 4:00 PM' in the zone. */
export function formatRange12(start: string | Date, end: string | Date, timeZone: string): string {
  return `${formatTime12(start, timeZone)} – ${formatTime12(end, timeZone)}`;
}

/**
 * One human line for e-mails / SMS / notices: 'Wednesday, October 7, 2026 · 17:30–18:00 (Africa/Johannesburg, GMT+2)'.
 * Always the CALENDAR's wall clock with the zone named — never the server's locale, which on Vercel is UTC and
 * would silently print the wrong clock time for any other zone. `end` is optional ('… · 17:30 (…)').
 */
export function formatWhenForMessage(start: string | Date, end: string | Date | null | undefined, timeZone: string | null | undefined): string {
  const tz = safeZone(timeZone);
  const date = formatDateLong(start, tz);
  const time = end ? `${formatTime24(start, tz)}–${formatTime24(end, tz)}` : formatTime24(start, tz);
  const short = tzShort(tz, start);
  return `${date} · ${time} (${short === tz ? tz : `${tz}, ${short}`})`;
}

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/**
 * Callers of the cancel/reschedule notices used to pass a pre-formatted `toLocaleString()` (server locale, no zone).
 * They now pass the ISO instant; this renders an ISO instant in the calendar's zone and leaves any other
 * (already-formatted) string untouched, so an old caller degrades to the old text rather than breaking.
 */
export function whenFromInstantOrText(value: string, timeZone: string | null | undefined): string {
  return ISO_INSTANT.test(value) ? formatWhenForMessage(value, null, timeZone) : value;
}
