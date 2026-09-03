export interface LockReason {
  type: 'coming_soon' | 'paid_locked' | 'dripped' | 'prerequisite' | 'requires_enrollment';
  message: string;
  /** Whole calendar days until unlock (>= 1 while locked). Only set for `dripped`. */
  diffDays?: number;
  /** ISO timestamp the lesson unlocks. Only set for `dripped`; lets the UI say
   *  "later today" / "tomorrow" instead of a misleading rounded day count. */
  unlockAt?: string;
}

interface LockCheckParams {
  lesson: any;
  module: any;
  moduleIndex: number;
  course: any;
  enrollment: any;
  modules: any[];
  lessonsByModule: Record<string, any[]>;
  completedLessonIds: string[];
}

/**
 * Checks if a lesson is locked and returns the locking details (type and message).
 */
export function getLessonLockReason({
  lesson,
  module,
  moduleIndex,
  course,
  enrollment,
  modules,
  lessonsByModule,
  completedLessonIds
}: LockCheckParams): LockReason | null {
  if (module.publish_status === 'coming_soon') {
    return { type: 'coming_soon', message: 'This module is coming soon!' };
  }

  // Course Start Method 3 (free preview, then paywall): a visitor with NO real enrollment
  // row at all (this is distinct from an enrolled-but-deactivated row, which
  // student/courses/[id]/page.tsx already handles separately as "Access paused" before this
  // function is ever reached for that case). Any is_preview lesson is genuinely open; every
  // other lesson needs a real paywall, not the drip/prerequisite placeholder styling below —
  // this is a different real state ("never enrolled"), not "enrolled but this one's locked".
  if (!enrollment) {
    if (lesson.is_preview) return null;
    return {
      type: 'requires_enrollment',
      message: 'Enroll in this course to unlock this lesson.',
    };
  }

  const isPaidCourse =
    course.pricing_model === 'one_time' ||
    course.pricing_model === 'subscription' ||
    course.pricing_model === 'hybrid';
  const isPaidLesson = lesson.access_level === 'paid';
  const hasPaid = enrollment?.payment_status === 'paid';

  if (isPaidLesson && isPaidCourse && !hasPaid) {
    return {
      type: 'paid_locked',
      message: 'This premium lesson is locked. Upgrading is required.'
    };
  }

  if (module.drip_days > 0 && enrollment?.enrolled_at) {
    const enrollDate = new Date(enrollment.enrolled_at);
    const unlockDate = new Date(enrollDate.getTime() + module.drip_days * 24 * 60 * 60 * 1000);
    const now = new Date();
    // Strictly-in-the-future check: the moment `now` reaches `unlockDate` this branch is
    // skipped and the lesson unlocks. `diffDays` is a whole-calendar-day count (>= 1 here),
    // so a lesson unlocking in a few hours never renders as "0 days" — the UI uses
    // `unlockAt` to say "later today" / "tomorrow" for near unlocks instead.
    if (now.getTime() < unlockDate.getTime()) {
      const startOfDay = (d: Date) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const diffDays = Math.max(
        1,
        Math.round((startOfDay(unlockDate) - startOfDay(now)) / (1000 * 60 * 60 * 24))
      );
      return {
        type: 'dripped',
        message: `This module is dripped. It will unlock in ${diffDays} day${diffDays === 1 ? '' : 's'}.`,
        diffDays,
        unlockAt: unlockDate.toISOString()
      };
    }
  }

  for (let i = 0; i < moduleIndex; i++) {
    const prevMod = modules[i];
    if (prevMod.required_for_completion) {
      const prevLessons = lessonsByModule[prevMod.id] || [];
      const prevLessonIds = prevLessons.map(pl => pl.id);
      const prevCompleted = prevLessonIds.filter(id => completedLessonIds.includes(id));
      if (prevCompleted.length < prevLessonIds.length && prevLessonIds.length > 0) {
        return {
          type: 'prerequisite',
          message: `Please complete all lessons in the required previous module: "${prevMod.title}" first.`
        };
      }
    }
  }

  // Lesson-to-lesson locking within the same module, driven by the lesson's own unlock_type
  // (Phase C, Step 3) — previously every lesson in a module was unlocked regardless of order;
  // only cross-module prerequisites (above) were ever enforced.
  const unlockType = lesson.unlock_type || 'sequential';

  if (unlockType === 'immediate') {
    return null;
  }

  const siblingLessons = lessonsByModule[module.id] || [];
  const lessonIndexInModule = siblingLessons.findIndex((l) => l.id === lesson.id);
  const prevLessonInModule = lessonIndexInModule > 0 ? siblingLessons[lessonIndexInModule - 1] : null;

  if (unlockType === 'drip') {
    if (module.drip_days > 0 && enrollment?.enrolled_at) {
      // Module-level drip already checked above; a 'drip' lesson with no dedicated per-lesson
      // schedule reuses the same enrollment-based module offset.
      return null;
    }
  }

  if (unlockType === 'sequential' || unlockType === 'quiz_gated') {
    if (prevLessonInModule && !completedLessonIds.includes(prevLessonInModule.id)) {
      return {
        type: 'prerequisite',
        message: unlockType === 'quiz_gated'
          ? `Please pass the quiz in "${prevLessonInModule.title}" first.`
          : `Please complete "${prevLessonInModule.title}" first.`
      };
    }
  }

  return null;
}
