import { describe, it, expect } from 'vitest';
import { getLessonLockReason } from './lock-utils';

// Regression guard for the drip "0 days while still locked" contradiction: once a module's
// enrollment-relative unlock time has passed, getLessonLockReason() must return null
// (unlocked); while it is still in the future it must hand the UI an `unlockAt` so the
// student sees "later today" / "tomorrow" rather than a misleading rounded count.

const baseParams = () => ({
  lesson: { id: 'l1', unlock_type: 'immediate', access_level: 'free' },
  module: { id: 'm1', publish_status: 'published', drip_days: 7 },
  moduleIndex: 0,
  course: { pricing_model: 'free' },
  modules: [{ id: 'm1', publish_status: 'published', drip_days: 7 }],
  lessonsByModule: { m1: [{ id: 'l1' }] },
  completedLessonIds: [] as string[],
});

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
const hoursAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000).toISOString();

describe('getLessonLockReason – drip scheduling', () => {
  it('unlocks the moment the scheduled time has passed (no stuck "0 days" state)', () => {
    // enrolled 7 days + 1 minute ago, drip_days = 7 → unlock time is 1 minute in the past
    const p = baseParams();
    p.module.drip_days = 7;
    const enrolledAt = new Date(Date.now() - (7 * 24 * 60 + 1) * 60 * 1000).toISOString();
    const reason = getLessonLockReason({ ...p, enrollment: { enrolled_at: enrolledAt } });
    expect(reason).toBeNull();
  });

  it('treats an exactly-elapsed unlock time as unlocked', () => {
    const p = baseParams();
    p.module.drip_days = 3;
    const reason = getLessonLockReason({ ...p, enrollment: { enrolled_at: daysAgo(3) } });
    expect(reason).toBeNull();
  });

  it('for a near unlock still in the future, returns dripped + a real unlockAt (never diffDays 0)', () => {
    const p = baseParams();
    p.module.drip_days = 1;
    // enrolled 22h ago, drip 1 day → unlocks ~2h from now, same or next calendar day
    const reason = getLessonLockReason({ ...p, enrollment: { enrolled_at: hoursAgo(22) } });
    expect(reason?.type).toBe('dripped');
    expect(reason?.unlockAt).toBeTruthy();
    expect(new Date(reason!.unlockAt!).getTime()).toBeGreaterThan(Date.now());
    expect(reason?.diffDays).toBeGreaterThanOrEqual(1);
  });

  it('reports a multi-day wait with a whole-day count', () => {
    const p = baseParams();
    p.module.drip_days = 10;
    const reason = getLessonLockReason({ ...p, enrollment: { enrolled_at: daysAgo(3) } });
    expect(reason?.type).toBe('dripped');
    expect(reason?.diffDays).toBe(7);
  });
});
