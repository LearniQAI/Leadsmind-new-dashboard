import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { inngest } from '@/lib/inngest'
import { logger } from '@/shared/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface WebhookDispatchEventData {
  workspaceId: string
  event: string
  data: Record<string, any>
}

export const webhookDispatchFn = inngest.createFunction(
  {
    id: 'webhook-dispatch',
    retries: 3,
    name: 'Dispatch Workspace Webhook',
    triggers: { event: 'webhook/dispatch' },
  },
  async ({ event: inngestEvent, step }) => {
    const { workspaceId, event, data } = inngestEvent.data as WebhookDispatchEventData

    const payload = {
      event,
      event_id: `evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 26)}`,
      workspace_id: workspaceId,
      timestamp: new Date().toISOString(),
      api_version: 'v1',
      data,
    }
    const payloadString = JSON.stringify(payload)

    const signingSecret = process.env.WEBHOOK_SIGNING_SECRET
    if (!signingSecret) {
      throw new Error('[FATAL] WEBHOOK_SIGNING_SECRET is not set')
    }

    await step.run('deliver-legacy-webhooks', async () => {
      const { data: webhooks, error: webhooksError } = await supabase
        .from('webhook_endpoints')
        .select('id, url, events, secret')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)

      let activeWebhooks: { id: string; url: string; events: string[]; secret: string | null }[] = []
      if (!webhooksError && webhooks) {
        activeWebhooks = webhooks.filter((w) => {
          const evs = w.events || []
          return evs.includes(event) || evs.includes('*') || evs.includes('all')
        })
      }

      const results = await Promise.allSettled(
        activeWebhooks.map(async (webhook) => {
          const startTime = Date.now()
          try {
            const secret = webhook.secret || signingSecret
            const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex')

            const res = await fetch(webhook.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-leadsmind-signature': signature,
                'x-leadsmind-event': event,
                'x-leadsmind-webhook-id': webhook.id,
                'User-Agent': 'LeadsMind-Webhooks/1.0',
              },
              body: payloadString,
              signal: AbortSignal.timeout(10000),
            })

            const latency = Date.now() - startTime
            await supabase.from('webhook_delivery_logs').insert({
              webhook_id: webhook.id,
              workspace_id: workspaceId,
              event,
              payload: { ...payload, latency_ms: latency },
              response_status: res.status,
              success: res.ok,
              delivered_at: new Date().toISOString(),
            })

            return { url: webhook.url, status: res.status }
          } catch (err: any) {
            const latency = Date.now() - startTime
            await supabase.from('webhook_delivery_logs').insert({
              webhook_id: webhook.id,
              workspace_id: workspaceId,
              event,
              payload: { ...payload, latency_ms: latency },
              response_status: 0,
              success: false,
              error_message: err.message,
              delivered_at: new Date().toISOString(),
            })
            throw err
          }
        })
      )

      return results
    })

    await step.run('deliver-zapier-webhooks', async () => {
      const { data: zapierSubs } = await supabase
        .from('webhook_subscriptions')
        .select('id, target_url')
        .eq('workspace_id', workspaceId)
        .eq('event', event)

      const results = await Promise.allSettled(
        (zapierSubs || []).map(async (sub) => {
          const res = await fetch(sub.target_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'LeadsMind-Zapier-Webhook/1.0',
              'x-leadsmind-event': event,
            },
            body: payloadString,
            signal: AbortSignal.timeout(10000),
          })
          return { url: sub.target_url, status: res.status }
        })
      )

      return results
    })

    logger.info({ workspaceId, event }, 'webhook.dispatch.complete')
  }
)
