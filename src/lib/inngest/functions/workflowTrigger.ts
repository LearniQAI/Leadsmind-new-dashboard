import { inngest } from '@/lib/inngest'
import { createAdminClient } from '@/lib/supabase/server'
import { WorkflowEngine, WorkflowContext } from '@/lib/automations/WorkflowEngine'
import { AutomationTriggerEvent, TriggerPayload } from '@/lib/automations/TriggerDispatcher'
import { logger } from '@/shared/logger'

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
  },
  async ({ event: inngestEvent, step }) => {
    const { event, payload } = inngestEvent.data as WorkflowTriggerEventData
    const supabase = createAdminClient()

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

    if (workflows.length === 0) {
      logger.info({ event, formId: payload.formId }, 'workflow_trigger.no_matching_workflows')
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
    }

    for (const wf of workflows) {
      await step.run(`run-workflow-${wf.id}`, async () => {
        await WorkflowEngine.runWorkflow(wf.id, context)
      })
    }

    return { matched: workflows.length }
  }
)
