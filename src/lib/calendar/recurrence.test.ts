import { describe, it, expect } from 'vitest';
import {
  buildRRule,
  parseRRule,
  expandOccurrences,
  normaliseRecurrence,
  describeRecurrence,
  RecurrenceError,
  MAX_OCCURRENCES,
  toRRuleUtc,
  fromRRuleUtc,
} from './recurrence';

describe('buildRRule', () => {
  it('weekly with count', () => {
    expect(buildRRule({ frequency: 'weekly', interval: 1, count: 4 })).toBe('FREQ=WEEKLY;INTERVAL=1;COUNT=4');
  });
  it('every 2 days with until', () => {
    expect(buildRRule({ frequency: 'daily', interval: 2, until: '2026-03-01T12:00:00.000Z' }))
      .toBe('FREQ=DAILY;INTERVAL=2;UNTIL=20260301T120000Z');
  });
  it('monthly', () => {
    expect(buildRRule({ frequency: 'monthly', interval: 1, count: 6 })).toBe('FREQ=MONTHLY;INTERVAL=1;COUNT=6');
  });
});

describe('normaliseRecurrence validation', () => {
  it('rejects count + until together', () => {
    expect(() => normaliseRecurrence({ frequency: 'weekly', interval: 1, count: 4, until: '2026-01-01' }))
      .toThrow(RecurrenceError);
  });
  it('rejects no end', () => {
    expect(() => normaliseRecurrence({ frequency: 'weekly', interval: 1 })).toThrow(RecurrenceError);
  });
  it('rejects count < 2', () => {
    expect(() => normaliseRecurrence({ frequency: 'weekly', interval: 1, count: 1 })).toThrow(RecurrenceError);
  });
  it(`rejects count > ${MAX_OCCURRENCES}`, () => {
    expect(() => normaliseRecurrence({ frequency: 'daily', interval: 1, count: MAX_OCCURRENCES + 1 })).toThrow(RecurrenceError);
  });
  it('rejects interval 0', () => {
    expect(() => normaliseRecurrence({ frequency: 'weekly', interval: 0, count: 3 })).toThrow(RecurrenceError);
  });
});

describe('parseRRule round-trips', () => {
  it('weekly count', () => {
    expect(parseRRule('FREQ=WEEKLY;INTERVAL=1;COUNT=4')).toEqual({ frequency: 'weekly', interval: 1, count: 4, until: null });
  });
  it('tolerates the RRULE: prefix', () => {
    expect(parseRRule('RRULE:FREQ=DAILY;INTERVAL=3;COUNT=2').frequency).toBe('daily');
  });
  it('parses UNTIL back to ISO', () => {
    const p = parseRRule('FREQ=DAILY;INTERVAL=1;UNTIL=20260301T120000Z');
    expect(p.until).toBe('2026-03-01T12:00:00.000Z');
  });
});

describe('expandOccurrences', () => {
  it('weekly x4 → 4 dates, 7 days apart, first is dtstart', () => {
    const occ = expandOccurrences('2026-01-05T09:00:00.000Z', 'FREQ=WEEKLY;INTERVAL=1;COUNT=4');
    expect(occ).toHaveLength(4);
    expect(occ[0].toISOString()).toBe('2026-01-05T09:00:00.000Z');
    expect(occ[1].toISOString()).toBe('2026-01-12T09:00:00.000Z');
    expect(occ[3].toISOString()).toBe('2026-01-26T09:00:00.000Z');
  });
  it('every 2 days', () => {
    const occ = expandOccurrences('2026-01-01T00:00:00.000Z', 'FREQ=DAILY;INTERVAL=2;COUNT=3');
    expect(occ.map((d) => d.toISOString())).toEqual([
      '2026-01-01T00:00:00.000Z',
      '2026-01-03T00:00:00.000Z',
      '2026-01-05T00:00:00.000Z',
    ]);
  });
  it('UNTIL bounds the series', () => {
    const occ = expandOccurrences('2026-01-01T09:00:00.000Z', 'FREQ=WEEKLY;INTERVAL=1;UNTIL=20260120T000000Z');
    // Jan 1, 8, 15 — Jan 22 is past UNTIL
    expect(occ).toHaveLength(3);
  });
  it('is hard-capped at MAX_OCCURRENCES', () => {
    const occ = expandOccurrences('2026-01-01T09:00:00.000Z', 'FREQ=DAILY;INTERVAL=1;UNTIL=20301231T000000Z');
    expect(occ).toHaveLength(MAX_OCCURRENCES);
  });
  it('monthly keeps day-of-month', () => {
    const occ = expandOccurrences('2026-01-15T10:00:00.000Z', 'FREQ=MONTHLY;INTERVAL=1;COUNT=3');
    expect(occ.map((d) => d.toISOString())).toEqual([
      '2026-01-15T10:00:00.000Z',
      '2026-02-15T10:00:00.000Z',
      '2026-03-15T10:00:00.000Z',
    ]);
  });
});

describe('date helpers', () => {
  it('toRRuleUtc / fromRRuleUtc round-trip', () => {
    const iso = '2026-06-01T14:30:00.000Z';
    expect(fromRRuleUtc(toRRuleUtc(iso)).toISOString()).toBe(iso);
  });
});

describe('describeRecurrence', () => {
  it('weekly count', () => {
    expect(describeRecurrence('FREQ=WEEKLY;INTERVAL=1;COUNT=4')).toBe('Repeats weekly, 4 occurrences');
  });
  it('every 2 weeks', () => {
    expect(describeRecurrence('FREQ=WEEKLY;INTERVAL=2;COUNT=3')).toContain('every 2 weeks');
  });
});
