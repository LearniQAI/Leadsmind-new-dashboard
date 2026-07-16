/**
 * Converts a local wall-clock date/time in a given IANA timezone to the
 * corresponding UTC instant, without pulling in date-fns-tz. Standard
 * technique: format a UTC guess back through the target timezone via
 * Intl (which has the real tz database, DST included) and correct by the
 * observed drift.
 */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const tzWallClock = new Date(utcGuess.toLocaleString('en-US', { timeZone }));
  const driftMs = utcGuess.getTime() - tzWallClock.getTime();

  return new Date(utcGuess.getTime() + driftMs);
}

/** Day-of-week (0=Sunday) for a plain 'YYYY-MM-DD' date, independent of the server's local timezone. */
export function isoDateDayOfWeek(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function formatInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  }).format(date);
}
