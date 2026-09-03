// Shared, framework-free helpers for the 3 landing templates (Clean / Bold / Cohort).
// Kept deliberately small — each template still owns its own layout/JSX. What's shared here
// is only the logic that MUST be identical across all three: how a real price is read from
// the course's pricing model, and how real curriculum facts are derived. Introduced by the
// "Premium Landing Page Templates" pass.

export interface PricingView {
  /** Big headline shown in the pricing block, e.g. "$149", "$29", "Free". */
  headline: string;
  /** Small qualifier under/next to the headline, e.g. "billed monthly", "one-time payment". */
  qualifier: string;
  /** Short badge/eyebrow, e.g. "One-time", "Subscription", "Free preview". */
  modelLabel: string;
  /** CTA button label appropriate to the model. */
  cta: string;
  /** True when there is genuinely nothing to pay up front. */
  isFree: boolean;
}

// Reads the REAL pricing model off the course row (courses.pricing_model / price /
// subscription_interval), not a `price ? … : 'Free'` guess. previewData is accepted for
// symmetry with the templates' merge pattern but the editor has no pricing fields today,
// so in practice this resolves from `course`.
export function getPricingView(course: any, previewData?: any): PricingView {
  const model: string = previewData?.pricing_model || course?.pricing_model || (course?.price ? 'one_time' : 'free');
  const rawPrice = previewData?.price ?? course?.price ?? 0;
  const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice) || 0;
  const interval: string = previewData?.subscription_interval || course?.subscription_interval || 'month';
  const money = `$${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`;

  switch (model) {
    case 'subscription':
      return {
        headline: money,
        qualifier: interval === 'year' ? 'billed yearly' : 'billed monthly',
        modelLabel: 'Subscription',
        cta: 'Subscribe & Start',
        isFree: false,
      };
    case 'hybrid':
      return {
        headline: price > 0 ? money : 'Free preview',
        qualifier: price > 0 ? 'to unlock every lesson' : 'upgrade anytime',
        modelLabel: 'Free preview',
        cta: 'Start Free, Upgrade Later',
        isFree: price <= 0,
      };
    case 'free':
      return {
        headline: 'Free',
        qualifier: 'no payment required',
        modelLabel: 'Free access',
        cta: 'Enroll for Free',
        isFree: true,
      };
    case 'one_time':
    default:
      return {
        headline: price > 0 ? money : 'Free',
        qualifier: price > 0 ? 'one-time payment · lifetime access' : 'no payment required',
        modelLabel: price > 0 ? 'One-time' : 'Free access',
        cta: price > 0 ? 'Enroll Now' : 'Enroll for Free',
        isFree: price <= 0,
      };
  }
}

export interface CourseFacts {
  moduleCount: number;
  lessonCount: number;
  previewCount: number;
  /** Whether the course row points at a certificate template. */
  hasCertificate: boolean;
  /**
   * Total minutes across every lesson, or null when it can't be trusted. course_lessons.
   * time_estimate_minutes is nullable with no default (migration 20260903000007) — most
   * lessons in an older course simply don't have one set. Summing only the lessons that
   * happen to have a value would understate the real total and mislead a buyer, so this is
   * only ever a number when EVERY real lesson has one; otherwise null, and callers must
   * degrade to showing just the lesson/module counts instead of a fabricated duration.
   */
  totalMinutes: number | null;
}

export function getCourseFacts(course: any, modules: any[], lessons: any[]): CourseFacts {
  const realModules = (modules || []).filter(Boolean);
  const realLessons = (lessons || []).filter(Boolean);
  const allHaveEstimates =
    realLessons.length > 0 && realLessons.every((l) => typeof l?.time_estimate_minutes === 'number');
  return {
    moduleCount: realModules.length,
    lessonCount: realLessons.length,
    previewCount: realLessons.filter((l) => l?.is_preview).length,
    hasCertificate: !!course?.certificate_template_id,
    totalMinutes: allHaveEstimates
      ? realLessons.reduce((sum, l) => sum + (l.time_estimate_minutes || 0), 0)
      : null,
  };
}

/** "5hr 34min" / "45min" — only called when totalMinutes is a real number. */
export function formatDuration(totalMinutes: number): string {
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs === 0) return `${mins}min`;
  if (mins === 0) return `${hrs}hr`;
  return `${hrs}hr ${mins}min`;
}
