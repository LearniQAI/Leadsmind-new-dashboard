import { describe, it, expect } from 'vitest';
import { retryBackoffSeconds, nextAttemptAt, shouldAlertOnFailureRate } from './retryConfig';

describe('retryBackoffSeconds', () => {
  it('follows the default 60 / 300 / 900 schedule and clamps past the end', () => {
    expect(retryBackoffSeconds(1)).toBe(60);
    expect(retryBackoffSeconds(2)).toBe(300);
    expect(retryBackoffSeconds(3)).toBe(900);
    expect(retryBackoffSeconds(4)).toBe(900);
    expect(retryBackoffSeconds(0)).toBe(60); // clamped up
  });

  it('nextAttemptAt returns an ISO timestamp the right distance in the future', () => {
    const from = new Date('2026-09-04T12:00:00.000Z');
    expect(nextAttemptAt(1, from)).toBe('2026-09-04T12:01:00.000Z');
    expect(nextAttemptAt(2, from)).toBe('2026-09-04T12:05:00.000Z');
  });
});

describe('shouldAlertOnFailureRate (PRD 5.5 — >10% in the window)', () => {
  it('does not alert below the minimum volume', () => {
    expect(shouldAlertOnFailureRate({ failed: 3, total: 4 })).toBe(false); // total < 5
  });

  it('does not alert with zero failures', () => {
    expect(shouldAlertOnFailureRate({ failed: 0, total: 50 })).toBe(false);
  });

  it('10% exactly does NOT trip (strictly greater than)', () => {
    expect(shouldAlertOnFailureRate({ failed: 1, total: 10 })).toBe(false);
  });

  it('above 10% with real volume trips', () => {
    expect(shouldAlertOnFailureRate({ failed: 2, total: 10 })).toBe(true);
    expect(shouldAlertOnFailureRate({ failed: 6, total: 40 })).toBe(true);
  });

  it('honours threshold / minVolume overrides', () => {
    expect(shouldAlertOnFailureRate({ failed: 3, total: 10, threshold: 0.5 })).toBe(false);
    expect(shouldAlertOnFailureRate({ failed: 3, total: 4, minVolume: 3 })).toBe(true);
  });
});
