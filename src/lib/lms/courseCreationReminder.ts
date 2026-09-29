// "You Are Creating a New Course" reminder — how often it appears.
//
// Default is ALWAYS ON. It is only ever reduced by an explicit tick of "Don't remind me for 30
// days" inside the modal, and that choice is visible and reversible from the Courses page
// (clearCourseReminderSnooze). Stored per browser (localStorage) as an expiry timestamp, so it
// lapses on its own and is never a silent permanent opt-out.

export const COURSE_REMINDER_KEY = 'lms.newCourseReminder.snoozedUntil';
export const COURSE_REMINDER_SNOOZE_DAYS = 30;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null; // private mode / blocked storage: fall back to always showing
  }
}

/** Epoch ms the snooze lasts until, or null if the reminder is not snoozed (or the snooze lapsed). */
export function getCourseReminderSnoozedUntil(now = Date.now(), storage: StorageLike | null = defaultStorage()): number | null {
  try {
    const raw = storage?.getItem(COURSE_REMINDER_KEY);
    const until = raw ? Number(raw) : NaN;
    return Number.isFinite(until) && until > now ? until : null;
  } catch {
    return null;
  }
}

export function shouldShowCourseReminder(now = Date.now(), storage: StorageLike | null = defaultStorage()): boolean {
  return getCourseReminderSnoozedUntil(now, storage) === null;
}

export function snoozeCourseReminder(now = Date.now(), storage: StorageLike | null = defaultStorage()): number {
  const until = now + COURSE_REMINDER_SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  try { storage?.setItem(COURSE_REMINDER_KEY, String(until)); } catch { /* storage unavailable: reminder just keeps showing */ }
  return until;
}

export function clearCourseReminderSnooze(storage: StorageLike | null = defaultStorage()): void {
  try { storage?.removeItem(COURSE_REMINDER_KEY); } catch { /* nothing to clear */ }
}
