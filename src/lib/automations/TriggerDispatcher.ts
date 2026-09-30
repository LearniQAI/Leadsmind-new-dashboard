/**
 * TriggerDispatcher — routes runtime events to corresponding active workflows.
 * Enqueues a durable Inngest event rather than running inline, so the pipeline
 * survives the originating serverless invocation being frozen/torn down after
 * the HTTP response is returned (see: setTimeout(...,0) does NOT survive that).
 */
import { inngest } from '@/lib/inngest';

export type AutomationTriggerEvent =
  | 'form_submitted'
  | 'partial_abandoned'
  | 'step_completed'
  | 'payment_completed'
  | 'payment_failed'
  | 'form_viewed'
  | 'recovery_link_opened';

export interface TriggerPayload {
  formId: string;
  workspaceId: string;
  formName: string;
  values: Record<string, any>;
  completionPercentage?: number;
  attribution?: Record<string, any>;
  isReturningContact?: boolean;
  metadata?: Record<string, any>;
  // Caller-resolved CRM contact id, when the trigger source already did its
  // own contact resolution (e.g. the public form-submit route). WorkflowEngine
  // uses this instead of re-deriving it from a weaker heuristic when present.
  contactId?: string | null;
  // Carries the originating HTTP request's request_id (e.g. the form-submit route's) through to
  // the Inngest-run workflow trigger, so its own timing log can be correlated back to the request
  // that caused it instead of appearing as an unrelated log line.
  requestId?: string;
  // The form_automation_jobs row this dispatch is for (see supabase/migrations/
  // 20260930000023_form_submission_job_queue.sql). workflowTriggerFn updates this row's
  // status/attempts as it runs, and the stuck-job reconciler cron re-sends this same event
  // (payload unchanged) if the row is still 'queued' after 2 minutes.
  jobId?: string;
}

export const TriggerDispatcher = {
  /**
   * Enqueues trigger events for matching workflows onto the Inngest queue.
   * Never throws — callers should not let dispatch failures block the
   * originating request, but the enqueue call itself is awaited so a failure
   * to *schedule* the job is at least caught and logged, unlike before.
   */
  async dispatch(
    event: AutomationTriggerEvent,
    payload: TriggerPayload
  ): Promise<void> {
    try {
      await inngest.send({
        // Inngest's own idempotency: an event with the same id sent again (e.g. the stuck-job
        // reconciler re-sending this exact job) will not invoke the function a second time,
        // regardless of whether the first invocation is still in flight or already finished.
        // Only set when this dispatch is for a tracked job — untracked trigger sources (not yet
        // migrated to the job-queue path) keep today's at-least-once, no-dedupe behavior.
        ...(payload.jobId ? { id: payload.jobId } : {}),
        name: 'workflow/trigger',
        data: { event, payload, requestId: payload.requestId },
      });
    } catch (err: any) {
      console.error(`[TriggerDispatcher] Failed to enqueue event ${event}:`, err);
    }
  }
};
