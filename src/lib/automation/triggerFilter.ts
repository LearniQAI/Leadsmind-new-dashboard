// Decides whether a published event satisfies a workflow's configured trigger
// filter. triggerWorkflows used to select on trigger_type alone, so "Tag added"
// fired for ANY tag, "Course completed" for ANY course, and so on, and the
// event payload was discarded before it reached the executor.

export interface TriggerFilterConfig {
  tag_id?: string;
  tag_name?: string;
  course_id?: string;
  funnel_id?: string;
}

// Triggers whose sequence configuration must name a specific tag/course/funnel.
export const FILTER_KIND_BY_TRIGGER = {
  tag_added: 'tag',
  student_enrolled_course: 'course',
  course_completed: 'course',
  funnel_subscribed: 'funnel',
} as const;

export type TriggerFilterKind = typeof FILTER_KIND_BY_TRIGGER[keyof typeof FILTER_KIND_BY_TRIGGER];

export function filterKindForTrigger(triggerType: string): TriggerFilterKind | null {
  return (FILTER_KIND_BY_TRIGGER as Record<string, TriggerFilterKind>)[triggerType] ?? null;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

/**
 * @param requireFilter  true for email sequences: a filterable trigger with no
 *   filter configured never matches (fails closed) instead of meaning "any".
 *   Generic workflows keep their historic "no filter = any" meaning.
 * A configured filter always fails closed when the event payload lacks the
 * field it needs to be checked against.
 */
export function matchesTriggerConfig(
  triggerType: string,
  config: TriggerFilterConfig | null | undefined,
  payload: Record<string, any> | null | undefined,
  opts: { requireFilter?: boolean } = {},
): boolean {
  const kind = filterKindForTrigger(triggerType);
  if (!kind) return true;

  const cfg = config ?? {};
  const p = payload ?? {};

  if (kind === 'tag') {
    const tagId = str(cfg.tag_id);
    const tagName = str(cfg.tag_name);
    if (!tagId && !tagName) return !opts.requireFilter;
    if (tagId && str(p.tagId) === tagId) return true;
    const evName = str(p.tag) ?? str(p.tagName);
    return !!(tagName && evName && evName.trim().toLowerCase() === tagName.trim().toLowerCase());
  }

  const wanted = str(kind === 'course' ? cfg.course_id : cfg.funnel_id);
  if (!wanted) return !opts.requireFilter;
  const got = str(kind === 'course' ? p.courseId : p.funnelId);
  return got === wanted;
}
