import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { webhookDispatchFn } from '@/lib/inngest/functions/webhookDispatch'
import { workflowTriggerFn } from '@/lib/inngest/functions/workflowTrigger'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [webhookDispatchFn, workflowTriggerFn],
})
