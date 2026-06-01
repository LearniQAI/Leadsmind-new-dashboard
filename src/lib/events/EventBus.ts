import { triggerWorkflows } from "@/lib/automation/executor";

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
  console.log(`[EventBus] Publishing event "${eventType}" for contact ${contactId} in workspace ${workspaceId}`);
  
  // Non-blocking asynchronous trigger
  triggerWorkflows(workspaceId, eventType, contactId).catch((err) => {
    console.error(`[EventBus] triggerWorkflows failed for event "${eventType}":`, err);
  });
}
