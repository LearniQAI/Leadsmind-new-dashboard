import { describe, it, expect } from 'vitest';
import { formatWhenForMessage, whenFromInstantOrText, tzShort } from './displayTime';

// Must hold in ANY process timezone (CI is UTC; developers and browsers are not).
describe('formatWhenForMessage', () => {
  it('renders the calendar clock and names the zone (Johannesburg, UTC+2)', () => {
    expect(formatWhenForMessage('2026-10-07T15:30:00Z', '2026-10-07T16:00:00Z', 'Africa/Johannesburg'))
      .toBe('Wednesday, October 7, 2026 · 17:30–18:00 (Africa/Johannesburg, GMT+2)');
  });
  it('UTC calendar', () => {
    expect(formatWhenForMessage('2026-10-07T15:30:00Z', '2026-10-07T16:00:00Z', 'UTC')).toBe('Wednesday, October 7, 2026 · 15:30–16:00 (UTC)');
  });
  it('crosses midnight into the next local day (Lagos UTC+1, Karachi UTC+5)', () => {
    expect(formatWhenForMessage('2026-10-07T23:30:00Z', null, 'Africa/Lagos')).toBe('Thursday, October 8, 2026 · 00:30 (Africa/Lagos, GMT+1)');
    expect(formatWhenForMessage('2026-10-07T22:30:00Z', null, 'Asia/Karachi')).toBe('Thursday, October 8, 2026 · 03:30 (Asia/Karachi, GMT+5)');
  });
  it('DST-correct label (London summer vs winter) and unknown zone falls back to UTC', () => {
    expect(tzShort('Europe/London', '2026-07-01T12:00:00Z')).toBe('GMT+1');
    expect(tzShort('Europe/London', '2026-01-15T12:00:00Z')).toBe('GMT');
    expect(formatWhenForMessage('2026-10-07T15:30:00Z', null, 'Not/AZone')).toMatch(/15:30 \(UTC\)$/);
  });
  it('does not depend on the process timezone', () => {
    const before = process.env.TZ;
    try {
      for (const tz of ['Asia/Karachi', 'America/Los_Angeles', 'UTC']) {
        process.env.TZ = tz;
        expect(formatWhenForMessage('2026-10-07T15:30:00Z', null, 'Africa/Johannesburg')).toContain('17:30');
      }
    } finally { process.env.TZ = before; }
  });
});

describe('whenFromInstantOrText', () => {
  it('formats an ISO instant in the calendar zone and leaves legacy text alone', () => {
    expect(whenFromInstantOrText('2026-10-07T15:30:00+00:00', 'Africa/Johannesburg')).toContain('17:30 (Africa/Johannesburg, GMT+2)');
    expect(whenFromInstantOrText('10/7/2026, 3:30:00 PM', 'Africa/Johannesburg')).toBe('10/7/2026, 3:30:00 PM');
  });
});
