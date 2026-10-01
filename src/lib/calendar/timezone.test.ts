import { describe, it, expect } from 'vitest';
import { zonedTimeToUtc } from './timezone';

// Regression: the old implementation re-parsed a formatted string in the PROCESS timezone, so it was only
// right on a UTC server. These cases must hold whatever TZ the test process runs in (CI runs UTC, a
// developer machine / browser does not).
describe('zonedTimeToUtc', () => {
  it('UTC wall clock is the same instant', () => {
    expect(zonedTimeToUtc('2026-10-07', '15:30', 'UTC').toISOString()).toBe('2026-10-07T15:30:00.000Z');
  });
  it('Africa/Johannesburg (UTC+2, no DST)', () => {
    expect(zonedTimeToUtc('2026-10-07', '17:30', 'Africa/Johannesburg').toISOString()).toBe('2026-10-07T15:30:00.000Z');
    expect(zonedTimeToUtc('2026-10-08', '00:30', 'Africa/Johannesburg').toISOString()).toBe('2026-10-07T22:30:00.000Z');
  });
  it('Africa/Lagos (UTC+1) and Asia/Karachi (UTC+5)', () => {
    expect(zonedTimeToUtc('2026-10-07', '16:30', 'Africa/Lagos').toISOString()).toBe('2026-10-07T15:30:00.000Z');
    expect(zonedTimeToUtc('2026-10-07', '20:30', 'Asia/Karachi').toISOString()).toBe('2026-10-07T15:30:00.000Z');
  });
  it('is DST-correct (Europe/London summer UTC+1, winter UTC+0) and across the spring-forward day', () => {
    expect(zonedTimeToUtc('2026-07-01', '12:00', 'Europe/London').toISOString()).toBe('2026-07-01T11:00:00.000Z');
    expect(zonedTimeToUtc('2026-01-15', '12:00', 'Europe/London').toISOString()).toBe('2026-01-15T12:00:00.000Z');
    expect(zonedTimeToUtc('2026-03-29', '12:00', 'Europe/London').toISOString()).toBe('2026-03-29T11:00:00.000Z');
  });
  it('does not depend on the process timezone', () => {
    const before = process.env.TZ;
    try {
      for (const tz of ['Asia/Karachi', 'America/Los_Angeles', 'UTC']) {
        process.env.TZ = tz;
        expect(zonedTimeToUtc('2026-10-07', '03:15', 'UTC').toISOString()).toBe('2026-10-07T03:15:00.000Z');
        expect(zonedTimeToUtc('2026-10-07', '17:30', 'Africa/Johannesburg').toISOString()).toBe('2026-10-07T15:30:00.000Z');
      }
    } finally {
      process.env.TZ = before;
    }
  });
});
