import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { webhookDispatchFn } from '@/lib/inngest/functions/webhookDispatch'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [webhookDispatchFn],
})
