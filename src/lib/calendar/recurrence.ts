import { addDays, addWeeks, addMonths } from 'date-fns';

// Task 69 — RFC-5545 recurrence, the shared representation for recurring
// meetings. We emit a real RRULE string (the same one Google Calendar,
// Outlook/Exchange and Apple Calendar consume natively) rather than a custom
// schema, and store it on `recurring_series.rrule` as the source of truth.
//
// v1 supported grammar: FREQ = DAILY | WEEKLY | MONTHLY, INTERVAL >= 1, and a
// bound of either COUNT or UNTIL. BYDAY / BYMONTHDAY / BYSETPOS ("Mon+Wed+Fri",
// "3rd Tuesday") are deliberately out of v1 scope — see the task doc.
//
// This replaces the old lib/calendar/recurring.ts (`generateRecurringSlots` —
// an uncalled fixed-count sketch with no RRULE, no UNTIL, no cap).

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export interface RecurrenceInput {
  frequency: RecurrenceFrequency;
  /** repeat every N periods; >= 1 */
  interval: number;
  /** total number of occurrences including the first; mutually exclusive with `until` */
  count?: number | null;
  /** ISO datetime of the last allowed occurrence; mutually exclusive with `count` */
  until?: string | null;
}

// A single series can never generate more than this many real appointment rows.
// Weekly-for-a-year is 52; this leaves headroom while keeping row volume bounded
// so no rolling regeneration job is needed.
export const MAX_OCCURRENCES = 60;

const FREQ_MAP: Record<RecurrenceFrequency, string> = {
  daily: 'DAILY',
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
};
const FREQ_REVERSE: Record<string, RecurrenceFrequency> = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
};

export class RecurrenceError extends Error {}

/** "2026-01-15T09:00:00.000Z" -> "20260115T090000Z" (RFC-5545 UTC form). */
export function toRRuleUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new RecurrenceError('Invalid UNTIL date');
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/** "20260115T090000Z" (or a plain ISO string) -> Date */
export function fromRRuleUtc(value: string): Date {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (m) {
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new RecurrenceError(`Unparseable RRULE date: ${value}`);
  return d;
}

/**
 * Validates + normalises a recurrence request. Throws RecurrenceError with a
 * user-safe message on anything invalid.
 */
export function normaliseRecurrence(input: RecurrenceInput): Required<Pick<RecurrenceInput, 'frequency' | 'interval'>> & {
  count: number | null;
  until: string | null;
} {
  if (!FREQ_MAP[input.frequency]) throw new RecurrenceError('Choose a repeat frequency of daily, weekly or monthly.');
  const interval = Math.floor(Number(input.interval));
  if (!Number.isFinite(interval) || interval < 1 || interval > 52) {
    throw new RecurrenceError('Repeat interval must be between 1 and 52.');
  }
  const hasCount = input.count != null && Number(input.count) > 0;
  const hasUntil = !!input.until;
  if (hasCount && hasUntil) throw new RecurrenceError('A recurring meeting ends after a number of occurrences OR on a date, not both.');
  if (!hasCount && !hasUntil) throw new RecurrenceError('A recurring meeting needs an end: a number of occurrences or an end date.');

  let count: number | null = null;
  if (hasCount) {
    count = Math.floor(Number(input.count));
    if (count < 2) throw new RecurrenceError('A recurring meeting needs at least 2 occurrences.');
    if (count > MAX_OCCURRENCES) throw new RecurrenceError(`A recurring meeting is limited to ${MAX_OCCURRENCES} occurrences.`);
  }

  let until: string | null = null;
  if (hasUntil) {
    const d = new Date(input.until as string);
    if (Number.isNaN(d.getTime())) throw new RecurrenceError('The recurrence end date is invalid.');
    until = d.toISOString();
  }

  return { frequency: input.frequency, interval, count, until };
}

/** Build the RFC-5545 RRULE value (no "RRULE:" prefix). */
export function buildRRule(input: RecurrenceInput): string {
  const n = normaliseRecurrence(input);
  const parts = [`FREQ=${FREQ_MAP[n.frequency]}`, `INTERVAL=${n.interval}`];
  if (n.count) parts.push(`COUNT=${n.count}`);
  else if (n.until) parts.push(`UNTIL=${toRRuleUtc(n.until)}`);
  return parts.join(';');
}

/** Parse the subset of RRULE we emit back to structured form. */
export function parseRRule(rrule: string): { frequency: RecurrenceFrequency; interval: number; count: number | null; until: string | null } {
  const map = new Map<string, string>();
  for (const part of rrule.replace(/^RRULE:/i, '').split(';')) {
    const [k, v] = part.split('=');
    if (k && v) map.set(k.toUpperCase(), v);
  }
  const freq = FREQ_REVERSE[(map.get('FREQ') || '').toUpperCase()];
  if (!freq) throw new RecurrenceError(`Unsupported RRULE FREQ: ${map.get('FREQ')}`);
  const interval = Math.max(1, parseInt(map.get('INTERVAL') || '1', 10));
  const count = map.has('COUNT') ? Math.max(1, parseInt(map.get('COUNT')!, 10)) : null;
  const until = map.has('UNTIL') ? fromRRuleUtc(map.get('UNTIL')!).toISOString() : null;
  return { frequency: freq, interval, count, until };
}

function step(base: Date, frequency: RecurrenceFrequency, times: number): Date {
  if (frequency === 'daily') return addDays(base, times);
  if (frequency === 'weekly') return addWeeks(base, times);
  return addMonths(base, times);
}

/**
 * Expand an RRULE to concrete occurrence START times. `dtstart` is always the
 * first occurrence. Hard-capped at MAX_OCCURRENCES regardless of what the rule
 * says. Time arithmetic is on the absolute instant (server runs UTC) — a
 * DST-crossing wall-clock drift for non-UTC calendars is a known v1 limitation
 * (matches the rest of this module's existing date handling).
 */
export function expandOccurrences(
  dtstartIso: string,
  rrule: string,
  opts: { maxCount?: number; rangeEndIso?: string } = {}
): Date[] {
  const { frequency, interval, count, until } = parseRRule(rrule);
  const dtstart = new Date(dtstartIso);
  if (Number.isNaN(dtstart.getTime())) throw new RecurrenceError('Invalid series start time');

  const cap = Math.min(opts.maxCount ?? MAX_OCCURRENCES, MAX_OCCURRENCES);
  const untilMs = until ? new Date(until).getTime() : null;
  const rangeEndMs = opts.rangeEndIso ? new Date(opts.rangeEndIso).getTime() : null;

  const out: Date[] = [];
  for (let i = 0; out.length < cap && i < MAX_OCCURRENCES * 20; i++) {
    const occ = step(dtstart, frequency, i * interval);
    if (untilMs != null && occ.getTime() > untilMs) break;
    if (rangeEndMs != null && occ.getTime() > rangeEndMs) break;
    out.push(occ);
    if (count != null && out.length >= count) break;
  }
  return out;
}

/** Human summary for confirmation copy, e.g. "Repeats weekly, 4 occurrences". */
export function describeRecurrence(rrule: string): string {
  const { frequency, interval, count, until } = parseRRule(rrule);
  const every = interval === 1 ? frequency : `every ${interval} ${frequency === 'daily' ? 'days' : frequency === 'weekly' ? 'weeks' : 'months'}`;
  const base = interval === 1 ? `Repeats ${every}` : `Repeats ${every}`;
  if (count) return `${base}, ${count} occurrences`;
  if (until) return `${base} until ${new Date(until).toISOString().slice(0, 10)}`;
  return base;
}
