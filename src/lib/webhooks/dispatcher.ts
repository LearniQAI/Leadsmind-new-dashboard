import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type WebhookEvent =
  | 'invoice.paid'
  | 'invoice.created'
  | 'invoice.sent'
  | 'contact.created'
  | 'contact.updated'
  | 'deal.won'
  | 'deal.lost'
  | 'deal.created'
  | 'form.submitted'
  | 'payment.received'
  | 'booking.confirmed'
  | 'course.completed'
  | 'review.received'
  | 'email.opened'
  | 'whatsapp.received'
  | 'task.completed'
  | 'kyc.identity.passed'
  | 'kyc.identity.failed'
  | 'bank.transaction.imported'

interface WebhookPayload {
  event: WebhookEvent
  event_id: string
  workspace_id: string
  timestamp: string
  api_version: string
  data: Record<string, any>
}

export async function dispatchWebhook(
  workspaceId: string,
  event: WebhookEvent,
  data: Record<string, any>
): Promise<void> {
  try {
    // Fetch all active webhooks for this workspace
    const { data: webhooks, error } = await supabase
      .from('workspace_webhooks')
      .select('id, url, label')
      .eq('workspace_id', workspaceId)
      .eq('active', true)

    if (error || !webhooks || webhooks.length === 0) return

    const payload: WebhookPayload = {
      event,
      event_id: `evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 26)}`,
      workspace_id: workspaceId,
      timestamp: new Date().toISOString(),
      api_version: 'v1',
      data,
    }

    const payloadString = JSON.stringify(payload)

    // Fire to all registered webhook URLs in parallel
    const fires = webhooks.map(async (webhook) => {
      try {
        // Generate HMAC signature
        const secret = process.env.WEBHOOK_SIGNING_SECRET ?? 'leadsmind_webhook_secret'
        const signature = crypto
          .createHmac('sha256', secret)
          .update(payloadString)
          .digest('hex')

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

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
          signal: controller.signal,
        })

        clearTimeout(timeout)

        // Log delivery attempt
        await supabase.from('webhook_delivery_logs').insert({
          webhook_id: webhook.id,
          workspace_id: workspaceId,
          event,
          payload: payload,
          response_status: res.status,
          success: res.ok,
          delivered_at: new Date().toISOString(),
        }).single()

      } catch (err: any) {
        // Log failure
        await supabase.from('webhook_delivery_logs').insert({
          webhook_id: webhook.id,
          workspace_id: workspaceId,
          event,
          payload: payload,
          response_status: 0,
          success: false,
          error_message: err.message,
          delivered_at: new Date().toISOString(),
        }).single()
      }
    })

    // Fire all without waiting (non-blocking)
    Promise.allSettled(fires).catch(() => {})

  } catch (err) {
    console.error('[webhook-dispatcher]', err)
  }
}
