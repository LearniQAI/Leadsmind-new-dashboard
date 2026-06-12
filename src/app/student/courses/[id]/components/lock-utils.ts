export interface LockReason {
  type: 'coming_soon' | 'paid_locked' | 'dripped' | 'prerequisite';
  message: string;
  diffDays?: number;
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
    if (now < unlockDate) {
      const diffMs = unlockDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return {
        type: 'dripped',
        message: `This module is dripped. It will unlock in ${diffDays} day${diffDays === 1 ? '' : 's'}.`,
        diffDays
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

  return null;
}
