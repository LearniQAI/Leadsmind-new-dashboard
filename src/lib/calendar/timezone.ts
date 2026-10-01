/** Milliseconds the zone's wall clock is ahead of UTC at the given instant (DST-aware). */
function zoneOffsetMs(instantMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(instantMs));
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const wallAsUtc = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour') % 24, n('minute'), n('second'));
  return wallAsUtc - Math.floor(instantMs / 1000) * 1000;
}

/**
 * Converts a local wall-clock date/time in a given IANA timezone to the corresponding UTC instant,
 * without pulling in date-fns-tz. The zone's UTC offset is read from Intl (real tz database, DST
 * included) as pure arithmetic on formatToParts numbers — never by re-parsing a formatted string,
 * which would be interpreted in the PROCESS timezone and be wrong anywhere but a UTC server
 * (e.g. a Karachi browser). A second pass settles instants next to a DST change.
 */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let instant = wallAsUtc - zoneOffsetMs(wallAsUtc, timeZone);
  const settled = wallAsUtc - zoneOffsetMs(instant, timeZone);
  if (settled !== instant) instant = settled;
  return new Date(instant);
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
