import { inngest } from '@/lib/inngest'
import { createAdminClient } from '@/lib/supabase/server'
import { WorkflowEngine, WorkflowContext } from '@/lib/automations/WorkflowEngine'
import { AutomationTriggerEvent, TriggerPayload } from '@/lib/automations/TriggerDispatcher'
import { logger } from '@/shared/logger'
import { newRequestId } from '@/shared/logger/requestId'
import { createStepTimer, logRequestComplete } from '@/shared/logger/requestTiming'

interface WorkflowTriggerEventData {
  event: AutomationTriggerEvent
  payload: TriggerPayload
}

/**
 * Durable replacement for the old setTimeout(...,0) fire-and-forget dispatch.
 * Runs on Inngest's queue so it survives the originating serverless invocation
 * being frozen/torn down after the HTTP response is returned, and gets retried
 * on transient failure instead of being silently dropped.
 */
export const workflowTriggerFn = inngest.createFunction(
  {
    id: 'workflow-trigger',
    retries: 3,
    name: 'Run Workflow Automations',
    triggers: { event: 'workflow/trigger' },
    // Fires exactly once, after Inngest has exhausted all `retries` — this is the only place a
    // form_automation_jobs row is marked terminally 'failed'. A per-attempt throw inside the
    // handler below is left as 'queued'/'running' (Inngest is still going to retry it), so the
    // job never shows "failed" while a retry is actually still pending.
    onFailure: async ({ event: failureEvent, error }) => {
      const originalData = (failureEvent.data.event.data ?? {}) as WorkflowTriggerEventData
      const jobId = originalData.payload?.jobId
      if (!jobId) return
      const supabase = createAdminClient()
      await supabase
        .from('form_automation_jobs')
        .update({
          status: 'failed',
          last_error: error.message?.slice(0, 2000) ?? 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId)
    },
  },
  async ({ event: inngestEvent, step }) => {
    const { event, payload } = inngestEvent.data as WorkflowTriggerEventData
    const supabase = createAdminClient()
    // Reuses the originating form-submit request's request_id when present (threaded through
    // TriggerDispatcher) so this run's timing correlates back to that HTTP request instead of
    // being an unrelated log line; falls back to a fresh id for any other trigger source.
    const requestId = payload.requestId || newRequestId()
    const timer = createStepTimer()
    const jobId = payload.jobId

    if (jobId) {
      // Idempotency guard #2, independent of Inngest's event-id dedup (TriggerDispatcher.dispatch
      // sends with id: jobId, and the reconciler re-sends with the same id) — a genuinely
      // separate second invocation for this job (dedup miss, or a race between the reconciler and
      // a still-finishing first run) only ever sees status already flipped away from 'queued'
      // here and stops immediately, rather than running the workflow(s) a second time.
      const claimed = await step.run('claim-job', async () => {
        const { data: rows } = await supabase
          .from('form_automation_jobs')
          .update({ status: 'running', started_at: new Date().toISOString() })
          .eq('id', jobId)
          .eq('status', 'queued')
          .select('id')
        // Separate from the claim update so a retry of just this step doesn't lose the
        // increment if the claim update itself is what gets retried.
        await supabase.rpc('increment_form_automation_job_attempts', { p_job_id: jobId })
        return (rows?.length ?? 0) > 0
      })

      if (!claimed) {
        logger.info({ jobId }, 'workflow_trigger.job_already_claimed_skipping')
        logRequestComplete({
          requestId,
          route: 'automation.workflow_trigger',
          method: 'INNGEST',
          status: 200,
          durationMs: timer.totalMs(),
          steps: timer.steps(),
          workspaceId: payload.workspaceId,
        })
        return { matched: 0, skipped: 'already_claimed' }
      }
    }

    const workflows = await step.run('find-matching-workflows', async () => {
      const { data, error } = await supabase
        .from('workflows')
        .select('id')
        .eq('form_id', payload.formId)
        .eq('trigger_type', event)
        .eq('is_active', true)

      if (error) throw error
      return data ?? []
    })
    timer.mark('find_matching_workflows')

    if (jobId) {
      await supabase.from('form_automation_jobs').update({ workflows_matched: workflows.length }).eq('id', jobId)
    }

    if (workflows.length === 0) {
      if (jobId) {
        await supabase
          .from('form_automation_jobs')
          .update({ status: 'succeeded', completed_at: new Date().toISOString() })
          .eq('id', jobId)
      }
      logger.info({ event, formId: payload.formId }, 'workflow_trigger.no_matching_workflows')
      logRequestComplete({
        requestId,
        route: 'automation.workflow_trigger',
        method: 'INNGEST',
        status: 200,
        durationMs: timer.totalMs(),
        steps: timer.steps(),
        workspaceId: payload.workspaceId,
      })
      return { matched: 0 }
    }

    const context: WorkflowContext = {
      workspaceId: payload.workspaceId,
      formName: payload.formName,
      values: payload.values,
      completionPercentage: payload.completionPercentage,
      attribution: payload.attribution,
      isReturningContact: payload.isReturningContact,
      metadata: payload.metadata,
      contactId: payload.contactId,
    }

    let runError: unknown = null
    try {
      for (const wf of workflows) {
        await step.run(`run-workflow-${wf.id}`, async () => {
          await WorkflowEngine.runWorkflow(wf.id, context)
        })
        timer.mark(`run_workflow_${wf.id}`)
      }
      // Reaching here means every matched workflow's step.run completed without throwing. A
      // per-step failure inside WorkflowEngine.runWorkflow is caught and logged internally
      // (marks that workflow_execution 'failed') rather than thrown, so this job is 'succeeded'
      // in the sense of "the trigger ran" — per-workflow outcomes are workflow_executions' job,
      // not this queue row's.
      if (jobId) {
        await supabase
          .from('form_automation_jobs')
          .update({ status: 'succeeded', completed_at: new Date().toISOString() })
          .eq('id', jobId)
      }
    } catch (err) {
      runError = err
      throw err
    } finally {
      logRequestComplete({
        requestId,
        route: 'automation.workflow_trigger',
        method: 'INNGEST',
        status: runError ? 500 : 200,
        durationMs: timer.totalMs(),
        steps: timer.steps(),
        workspaceId: payload.workspaceId,
        error: runError,
      })
    }

    return { matched: workflows.length }
  }
)
