/**
 * business_hours.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure utilities for Business Hours Sending Window enforcement.
 * No side-effects, no I/O — unit-testable in isolation.
 *
 * Uses the native `Intl` API so no extra dependencies are required.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * The shape stored in `workflow_steps.business_hours` (JSONB).
 * All fields are optional so partially-configured steps degrade gracefully.
 */
export interface BusinessHoursConfig {
  /** Toggle — when false the step executes immediately regardless of time. */
  enabled: boolean;

  /**
   * Where to source the contact's timezone.
   * - 'contact' : read from `contacts.timezone` (default)
   * - 'fixed'   : always use the `timezone` field below
   */
  timezone_source?: "contact" | "fixed";

  /**
   * IANA timezone identifier, e.g. "America/New_York".
   * Used only when `timezone_source === 'fixed'` or as a fallback.
   */
  timezone?: string;

  /**
   * Days of the week on which sending is allowed.
   * 0 = Sunday, 1 = Monday … 6 = Saturday.
   * Defaults to [1, 2, 3, 4, 5] (Mon–Fri) when not supplied.
   */
  allowed_days?: number[];

  /**
   * Earliest time messages may be sent, in "HH:MM" 24-hour format.
   * Defaults to "08:00".
   */
  start_time?: string;

  /**
   * Latest time messages may be sent, in "HH:MM" 24-hour format.
   * Defaults to "17:00".
   */
  end_time?: string;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_ALLOWED_DAYS: number[] = [1, 2, 3, 4, 5]; // Mon–Fri
const DEFAULT_START_TIME = "08:00";
const DEFAULT_END_TIME = "17:00";
const FALLBACK_TIMEZONE = "UTC";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "HH:MM" → { hours, minutes } */
function parseTime(hhmm: string): { hours: number; minutes: number } {
  const [h, m] = hhmm.split(":").map(Number);
  return { hours: isNaN(h) ? 0 : h, minutes: isNaN(m) ? 0 : m };
}

/**
 * Resolve the effective IANA timezone string.
 * Falls back to UTC if nothing is set so a step is never silently skipped.
 */
function resolveTimezone(
  config: BusinessHoursConfig,
  contactTimezone?: string | null
): string {
  if (config.timezone_source === "fixed" && config.timezone) {
    return config.timezone;
  }
  // 'contact' (default): use what's on the contact record, then the fixed
  // field as a secondary fallback, then UTC.
  return contactTimezone || config.timezone || FALLBACK_TIMEZONE;
}

/**
 * Return a Date object that represents `date` in the given IANA timezone.
 * We use `Intl.DateTimeFormat` to extract parts rather than manipulating
 * UTC offsets directly — this correctly handles DST transitions.
 */
function getLocalParts(
  date: Date,
  tz: string
): { year: number; month: number; day: number; weekday: number; hours: number; minutes: number } {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      weekday: "short",
    });

    const parts = fmt.formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";

    // weekday short names → 0-indexed (Sun=0) matching JS Date convention
    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const weekday = weekdayMap[get("weekday")] ?? 0;

    let hours = parseInt(get("hour"), 10);
    // Intl with hour12:false may return "24" for midnight
    if (hours === 24) hours = 0;

    return {
      year: parseInt(get("year"), 10),
      month: parseInt(get("month"), 10), // 1-indexed
      day: parseInt(get("day"), 10),
      weekday,
      hours,
      minutes: parseInt(get("minute"), 10),
    };
  } catch {
    // If the timezone string is invalid, fall back to UTC
    return getLocalParts(date, FALLBACK_TIMEZONE);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Determine whether `now` falls inside the configured business hours window.
 *
 * @param config          Business hours configuration from the step.
 * @param contactTimezone IANA timezone string from the contact record (may be null).
 * @param now             Defaults to the current moment — injectable for testing.
 */
export function isWithinBusinessHours(
  config: BusinessHoursConfig | null | undefined,
  contactTimezone?: string | null,
  now: Date = new Date()
): boolean {
  // If no config, or explicitly disabled, always allow.
  if (!config || !config.enabled) return true;

  const tz = resolveTimezone(config, contactTimezone);
  const allowedDays = config.allowed_days ?? DEFAULT_ALLOWED_DAYS;
  const { hours: startH, minutes: startM } = parseTime(config.start_time ?? DEFAULT_START_TIME);
  const { hours: endH, minutes: endM } = parseTime(config.end_time ?? DEFAULT_END_TIME);

  const local = getLocalParts(now, tz);

  // 1. Check day-of-week
  if (!allowedDays.includes(local.weekday)) return false;

  // 2. Check time range (exclusive end — a message at 17:00 is not within 08:00–17:00)
  const currentMinutes = local.hours * 60 + local.minutes;
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Calculate the next moment when business hours open, given the current time.
 * Returns a Date in UTC.
 *
 * @param config          Business hours configuration.
 * @param contactTimezone IANA timezone string from the contact record.
 * @param now             Defaults to the current moment — injectable for testing.
 */
export function nextWindowOpen(
  config: BusinessHoursConfig,
  contactTimezone?: string | null,
  now: Date = new Date()
): Date {
  const tz = resolveTimezone(config, contactTimezone);
  const allowedDays = config.allowed_days ?? DEFAULT_ALLOWED_DAYS;
  const { hours: startH, minutes: startM } = parseTime(config.start_time ?? DEFAULT_START_TIME);
  const { hours: endH, minutes: endM } = parseTime(config.end_time ?? DEFAULT_END_TIME);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Walk forward day by day (cap at 8 days to prevent infinite loops on
  // misconfigured allowed_days: [])
  const candidate = new Date(now);

  for (let attempt = 0; attempt < 8; attempt++) {
    const local = getLocalParts(candidate, tz);
    const currentMinutes = local.hours * 60 + local.minutes;

    if (allowedDays.includes(local.weekday)) {
      if (currentMinutes < startMinutes) {
        // Same day — fast-forward to window start
        return buildDateInTz(local.year, local.month, local.day, startH, startM, tz);
      }
      if (currentMinutes < endMinutes) {
        // We are INSIDE the window right now (caller shouldn't be here,
        // but return "now" defensively).
        return new Date(candidate);
      }
    }

    // Advance to midnight of the next calendar day (in the target TZ)
    // We do this by moving to next day's window start.
    const nextDay = new Date(candidate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    // Reset to beginning of that UTC day and let the loop re-evaluate TZ parts
    nextDay.setUTCHours(0, 0, 0, 0);
    candidate.setTime(nextDay.getTime());
  }

  // Fallback: 24 hours from now (never triggered on valid config)
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

/**
 * Build a UTC Date that corresponds to a specific local clock time in `tz`.
 * Approach: construct an approximate UTC time then refine using the actual offset.
 */
function buildDateInTz(
  year: number,
  month: number, // 1-indexed
  day: number,
  hours: number,
  minutes: number,
  tz: string
): Date {
  // First approximation: assume UTC = local
  const approx = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

  // Find the actual UTC offset at this moment in the target TZ
  const localParts = getLocalParts(approx, tz);
  const approxLocalMinutes = localParts.hours * 60 + localParts.minutes;
  const targetMinutes = hours * 60 + minutes;
  const offsetMinutes = approxLocalMinutes - targetMinutes; // how far UTC is off

  // Adjust
  return new Date(approx.getTime() - offsetMinutes * 60 * 1000);
}
