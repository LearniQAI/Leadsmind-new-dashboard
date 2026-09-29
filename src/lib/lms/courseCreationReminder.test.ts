import { describe, it, expect } from 'vitest';
import {
  shouldShowCourseReminder,
  snoozeCourseReminder,
  clearCourseReminderSnooze,
  getCourseReminderSnoozedUntil,
  COURSE_REMINDER_KEY,
} from './courseCreationReminder';

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};
const DAY = 24 * 60 * 60 * 1000;

describe('new-course reminder frequency', () => {
  it('is always on by default', () => {
    expect(shouldShowCourseReminder(1_000, mem())).toBe(true);
  });
  it('an explicit snooze hides it for exactly 30 days, then it comes back on its own', () => {
    const s = mem();
    const until = snoozeCourseReminder(1_000, s);
    expect(until).toBe(1_000 + 30 * DAY);
    expect(shouldShowCourseReminder(1_000 + 29 * DAY, s)).toBe(false);
    expect(shouldShowCourseReminder(1_000 + 30 * DAY + 1, s)).toBe(true);
  });
  it('is reversible', () => {
    const s = mem();
    snoozeCourseReminder(1_000, s);
    clearCourseReminderSnooze(s);
    expect(shouldShowCourseReminder(2_000, s)).toBe(true);
    expect(getCourseReminderSnoozedUntil(2_000, s)).toBeNull();
  });
  it('garbage or unavailable storage never silently disables the reminder', () => {
    const s = mem();
    s.setItem(COURSE_REMINDER_KEY, 'not-a-number');
    expect(shouldShowCourseReminder(1_000, s)).toBe(true);
    expect(shouldShowCourseReminder(1_000, null)).toBe(true);
    const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => {} };
    expect(shouldShowCourseReminder(1_000, throwing)).toBe(true);
    expect(() => snoozeCourseReminder(1_000, throwing)).not.toThrow();
  });
});
