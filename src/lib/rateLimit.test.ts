import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimits } from './rateLimit';

describe('checkRateLimit (per-instance sliding window)', () => {
  beforeEach(() => resetRateLimits());

  it('allows up to the limit, then blocks with a retry hint', () => {
    for (let i = 0; i < 3; i++) expect(checkRateLimit('ip-a', 3, 60_000, 1_000 + i).allowed).toBe(true);
    const blocked = checkRateLimit('ip-a', 3, 60_000, 1_010);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(1_000 + 60_000 - 1_010);
  });
  it('keys are independent', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('ip-a', 3, 60_000, 1_000);
    expect(checkRateLimit('ip-a', 3, 60_000, 1_001).allowed).toBe(false);
    expect(checkRateLimit('ip-b', 3, 60_000, 1_001).allowed).toBe(true);
  });
  it('frees capacity as hits leave the window', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('ip-a', 3, 60_000, 1_000);
    expect(checkRateLimit('ip-a', 3, 60_000, 30_000).allowed).toBe(false);
    expect(checkRateLimit('ip-a', 3, 60_000, 61_001).allowed).toBe(true);
  });
});
