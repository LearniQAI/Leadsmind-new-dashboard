import { triggerWorkflows } from "@/lib/automation/executor";
import { logger } from "@/shared/logger";
import { waitUntil } from "@vercel/functions";

export const EVENT_TRIGGERS = {
  STUDENT_ENROLLED_COURSE: 'student_enrolled_course',
  STUDENT_ENROLLED_BUNDLE: 'student_enrolled_bundle',
  COURSE_COMPLETED: 'course_completed',
  MODULE_COMPLETED: 'module_completed',
  LESSON_COMPLETED: 'lesson_completed',
  QUIZ_PASSED: 'quiz_passed',
  QUIZ_FAILED: 'quiz_failed',
  QUIZ_LIMIT_REACHED: 'quiz_limit_reached',
  CERT_ISSUED: 'cert_issued',
  CERT_EXPIRING: 'cert_expiring',
  COURSE_EXPIRING: 'course_expiring',
  COURSE_REVOKED: 'course_revoked',
  STUDENT_INACTIVE: 'student_inactive',
  STRUGGLE_THRESHOLD_CROSSED: 'struggle_threshold_crossed',
  ASSIGNMENT_SUBMITTED: 'assignment_submitted',
  ASSIGNMENT_GRADED: 'assignment_graded',
  LIVE_SESSION_BOOKED: 'live_session_booked',
  FUNNEL_SUBSCRIBED: 'funnel_subscribed',
  PAYFAST_PAYMENT_COURSE: 'payfast_payment_course',
  OPPORTUNITY_STAGE_CHANGED: 'opportunity_stage_changed',
  TAG_ADDED: 'tag_added',
  TAG_REMOVED: 'tag_removed',
  TAG_UPDATED: 'tag_updated',
  TAG_EXPIRED: 'tag_expired',
  TAG_CONFIDENCE_CHANGED: 'tag_confidence_changed',
  CONTACT_CREATED: 'contact_created',
  APPOINTMENT_BOOKED: 'appointment_booked',
  INVOICE_PAID: 'invoice_paid',
} as const;

export type EventTriggerType = typeof EVENT_TRIGGERS[keyof typeof EVENT_TRIGGERS];

/**
 * Publishes a system event to trigger matched active automation workflows.
 */
export async function publishEvent(
  workspaceId: string,
  eventType: EventTriggerType,
  contactId: string,
  payload: any = {}
) {
  // Logging is observability, not business logic — a broken log transport
  // (e.g. pino's worker-thread transport dying) must never be able to abort
  // event dispatch or mask a real triggerWorkflows failure.
  try {
    logger.info({ eventType, contactId, workspaceId }, "event_bus.publishing");
  } catch { /* logging failure must not block dispatch */ }

  // Non-blocking asynchronous trigger. Callers intentionally don't await
  // this (see contacts.ts, tags.ts, etc.) so the request/action returns
  // fast — but an un-awaited promise has no guarantee of completing once
  // the response is sent: Vercel can freeze/tear down the serverless
  // invocation right after return, silently killing this mid-flight with
  // no error anywhere (confirmed live: a real contact_created trigger
  // produced zero workflow_executions rows and zero logged errors).
  // waitUntil() extends the invocation's lifetime until this settles. In
  // contexts with no Vercel request/cron context (local dev, tests, or
  // any caller outside a Vercel Function), getContext().waitUntil is
  // undefined and this call is a no-op — the promise still runs as a
  // normal fire-and-forget, matching prior behavior exactly.
  const trigger = triggerWorkflows(workspaceId, eventType, contactId).catch((err) => {
    try {
      logger.error({ err, eventType }, "event_bus.trigger_workflows.failed");
    } catch { /* logging failure must not mask the real error */ }
  });
  const autoSender = (eventType === EVENT_TRIGGERS.CONTACT_CREATED || eventType === EVENT_TRIGGERS.TAG_ADDED)
    ? import('@/lib/campaigns/autoSender')
      .then(({ enqueueAutoSenderCampaigns }) => enqueueAutoSenderCampaigns(workspaceId, contactId))
      .catch((err) => logger.error({ err, eventType, contactId, workspaceId }, 'event_bus.auto_sender.failed'))
    : Promise.resolve();
  waitUntil(Promise.all([trigger, autoSender]));
}
