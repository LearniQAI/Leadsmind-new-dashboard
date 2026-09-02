// Pure decision helpers for the LMS automation event bus (Batch 1 — "Make Course
// Automations Actually Work"). Kept in their own module — with NO Supabase / env
// imports — so they can be unit-tested without constructing a service-role client.

/**
 * Course scoping predicate (G1). A rule with `course_id` set fires ONLY for events on
 * that course; a rule with `course_id` NULL is workspace-wide (fires for every course).
 * An event with no `courseId` can only match workspace-wide rules.
 */
export function ruleMatchesCourse(
  rule: { course_id?: string | null },
  eventCourseId: string | null | undefined
): boolean {
  if (!rule.course_id) return true;
  return eventCourseId != null && rule.course_id === eventCourseId;
}

/**
 * Quiz score gate. `quiz_passed` / `quiz_failed` rules may carry
 * `trigger_config.min_score` (the builder's "Minimum Score (%)"). Returns true when the
 * rule has no score gate, or the real server-graded score satisfies it:
 *   quiz_passed -> score >= min_score
 *   quiz_failed -> score <  min_score
 */
export function quizScoreGatePasses(
  eventType: string,
  rule: { trigger_config?: { min_score?: number | null } | null },
  score: number | null | undefined
): boolean {
  if (eventType !== 'quiz_passed' && eventType !== 'quiz_failed') return true;
  const min = rule.trigger_config?.min_score;
  if (min == null || score == null) return true;
  return eventType === 'quiz_passed' ? Number(score) >= Number(min) : Number(score) < Number(min);
}
