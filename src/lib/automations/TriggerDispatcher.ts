/**
 * TriggerDispatcher — routes runtime events to corresponding active workflows.
 * Operates asynchronously and isolates failures so form submissions are never blocked.
 */
import { createAdminClient } from '@/lib/supabase/server';
import { WorkflowEngine, WorkflowContext } from './WorkflowEngine';

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
}

export const TriggerDispatcher = {
  /**
   * Dispatches trigger events to matching workflows.
   * Completely isolated and async.
   */
  dispatch(
    event: AutomationTriggerEvent,
    payload: TriggerPayload
  ): void {
    // Immediate execution inside a non-blocking macroTask
    setTimeout(async () => {
      const supabase = createAdminClient();

      try {
        // Query active workflows that match this formId and trigger event
        const { data: workflows, error } = await supabase
          .from('workflows')
          .select('id')
          .eq('form_id', payload.formId)
          .eq('trigger_type', event)
          .eq('is_active', true);

        if (error) {
          console.error(`[TriggerDispatcher] Workflow query failed for event ${event}:`, error);
          return;
        }

        if (!workflows || workflows.length === 0) {
          return; // No active workflow triggers for this event
        }

        // Run engine pipelines for each match in parallel
        const context: WorkflowContext = {
          workspaceId: payload.workspaceId,
          formName: payload.formName,
          values: payload.values,
          completionPercentage: payload.completionPercentage,
          attribution: payload.attribution,
          isReturningContact: payload.isReturningContact,
          metadata: payload.metadata
        };

        await Promise.all(
          workflows.map(wf =>
            WorkflowEngine.runWorkflow(wf.id, context).catch(err => {
              console.error(`[TriggerDispatcher] Pipeline error for workflow ${wf.id}:`, err);
            })
          )
        );

      } catch (err: any) {
        console.error(`[TriggerDispatcher] Event dispatch crash for ${event}:`, err);
      }
    }, 0);
  }
};
