// Scheduling validation for WhatsApp broadcasts. Kept out of the 'use server' actions file (which may only export
// async functions) so it is importable by tests.
export const SCHEDULE_INVALID_MESSAGE =
  'The scheduled date and time is not valid. Pick a date and time, or leave it empty to send now.';
export const SCHEDULE_PAST_MESSAGE =
  'The scheduled time is in the past. Pick a future date and time, or leave it empty to send now.';
const SCHEDULE_PAST_TOLERANCE_MS = 60_000; // a form left open for a minute must not trip the check

/** Empty = send now. A value must parse as a date and must not be in the past. */
export function resolveScheduledFor(
  raw: string | null | undefined,
  now: Date = new Date(),
): { ok: true; iso: string } | { ok: false; error: string } {
  if (raw == null || String(raw).trim() === '') return { ok: true, iso: now.toISOString() };
  const when = new Date(raw);
  if (Number.isNaN(when.getTime())) return { ok: false, error: SCHEDULE_INVALID_MESSAGE };
  if (when.getTime() < now.getTime() - SCHEDULE_PAST_TOLERANCE_MS) return { ok: false, error: SCHEDULE_PAST_MESSAGE };
  return { ok: true, iso: when.toISOString() };
}
