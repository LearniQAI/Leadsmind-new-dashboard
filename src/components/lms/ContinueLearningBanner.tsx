import Link from 'next/link';
import { ArrowRight, BookOpen, Play } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

/**
 * "Continue learning" banner for the student dashboard.
 *
 * Rebuilt against the real schema. The previous version queried `student_portal_assignments`,
 * `lessons`/`modules`, `lesson_completions` and `courses.name` — none of which exist on the
 * live schema — so an early `return null` always fired and the banner never rendered.
 *
 * It now takes the already-fetched enrolment list from the dashboard (the same
 * getEnrolledCoursesWithProgress() result the "My courses" grid uses — no second query, no
 * new progress math) and surfaces the single course to jump back into.
 *
 * Selection (see pickContinueLearningCourse):
 *   1. Among enrolments with progressPercentage < 100, pick the most recently active one,
 *      ranked by `enrollments.last_active_at` (written by the player heartbeat; defaults to
 *      enrolled_at, so this naturally falls back to "most recently enrolled" when the student
 *      has no real activity yet).
 *   2. If every enrolled course is already 100% complete, or the student has no enrolments,
 *      render nothing — the dashboard header already has an "Explore catalog" CTA and the
 *      "My courses" section already handles the empty state, so a second prompt is just noise.
 *
 * Continue button → /student/courses/[id] (same page as "My courses" → Start/Resume). When a
 * real last_lesson_id exists it passes ?restore=true&lessonId=&t= so StudentPlayerClient
 * opens that lesson and (for video lessons) seeks to last_position_seconds. With no
 * last_lesson_id the player opens at the first lesson — it has no independent
 * "resume at first incomplete lesson" logic to defer to.
 */

export interface ContinueLearningCourse {
  id: string;
  title: string;
  description?: string | null;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  lastActiveAt?: string | null;
  lastLessonId?: string | null;
  lastPositionSeconds?: number | null;
  enrolledAt?: string | null;
}

export function pickContinueLearningCourse<T extends ContinueLearningCourse>(
  courses: T[] | null | undefined
): T | null {
  if (!courses || courses.length === 0) return null;

  const incomplete = courses.filter((c) => (c.progressPercentage ?? 0) < 100);
  if (incomplete.length === 0) return null;

  return [...incomplete].sort((a, b) => {
    const ta = new Date(a.lastActiveAt || a.enrolledAt || 0).getTime();
    const tb = new Date(b.lastActiveAt || b.enrolledAt || 0).getTime();
    return tb - ta;
  })[0];
}

export default function ContinueLearningBanner({
  courses,
}: {
  courses: ContinueLearningCourse[];
}) {
  const course = pickContinueLearningCourse(courses);
  if (!course) return null;

  const pct = course.progressPercentage || 0;
  const started = pct > 0 || (course.completedLessons ?? 0) > 0 || !!course.lastLessonId;

  const href = course.lastLessonId
    ? `/student/courses/${course.id}?restore=true&lessonId=${course.lastLessonId}&t=${course.lastPositionSeconds || 0}`
    : `/student/courses/${course.id}`;

  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-dash-border bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 md:p-6"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-dash-accent/10 !text-dash-accent ring-1 ring-inset ring-dash-accent/15 [&_svg]:size-5">
            <BookOpen />
          </span>
          <div className="min-w-0 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] !text-dash-accent">
              {started ? 'Continue learning' : 'Start learning'}
            </span>
            <h2 className="line-clamp-1 font-display text-[18px] font-semibold tracking-[-0.01em] !text-dash-text">
              {course.title}
            </h2>
            <div className="max-w-xs space-y-1.5">
              <div className="flex items-center justify-between text-[12px] font-medium !text-dash-textMuted">
                <span>
                  {course.completedLessons ?? 0}/{course.totalLessons} lessons
                </span>
                <span className="font-semibold !text-dash-text">{pct}%</span>
              </div>
              <Progress value={pct} className="h-1.5 bg-dash-surface" />
            </div>
          </div>
        </div>

        <span className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-dash-accent px-5 text-[12px] font-semibold text-white transition-colors group-hover:bg-dash-accent/90 [&_svg]:size-3.5">
          <Play className="fill-current" />
          {started ? 'Resume' : 'Start'}
          <ArrowRight className="transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0" />
        </span>
      </div>
    </Link>
  );
}
