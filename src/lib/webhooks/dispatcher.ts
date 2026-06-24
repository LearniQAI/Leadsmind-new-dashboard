import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type WebhookEvent =
  // Contacts
  | 'contact.created'
  | 'contact.updated'
  // Deals / opportunities
  | 'deal.created'
  | 'deal.stage_changed'
  | 'deal.won'
  | 'deal.lost'
  // Invoices / payments
  | 'invoice.created'
  | 'invoice.sent'
  | 'invoice.paid'
  | 'invoice.overdue'
  | 'payment.received'
  // Bookings
  | 'booking.created'
  | 'booking.confirmed'
  | 'booking.cancelled'
  | 'booking.completed'
  | 'booking.no_show'
  // Forms
  | 'form.submitted'
  // Courses / sequences
  | 'course.enrolment'
  | 'course.completed'
  | 'sequence.enrolled'
  | 'sequence.completed'
  // Reviews / comms
  | 'review.received'
  | 'email.opened'
  | 'whatsapp.received'
  // Tasks / team / workspace
  | 'task.completed'
  | 'team.member.created'
  | 'workspace.limit.approaching'
  // KYC / banking
  | 'kyc.identity.passed'
  | 'kyc.identity.failed'
  | 'bank.transaction.imported'
  // SA-specific
  | 'sars.deadline.approaching'
  | 'load_shedding.conflict'

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
    const payload: WebhookPayload = {
      event,
      event_id: `evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 26)}`,
      workspace_id: workspaceId,
      timestamp: new Date().toISOString(),
      api_version: 'v1',
      data,
    }

    const payloadString = JSON.stringify(payload)

    // 1) Fetch all active webhooks for this workspace from webhook_endpoints
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhook_endpoints')
      .select('id, url, events, secret')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)

    let activeWebhooks = []
    if (!webhooksError && webhooks) {
      activeWebhooks = webhooks.filter((w) => {
        const evs = w.events || []
        return evs.includes(event) || evs.includes('*') || evs.includes('all')
      })
    }

    // 2) Fetch Zapier REST Hooks subscriptions for this event
    const { data: zapierSubs } = await supabase
      .from('webhook_subscriptions')
      .select('id, target_url')
      .eq('workspace_id', workspaceId)
      .eq('event', event)

    // 3) Fire legacy/custom webhooks in parallel
    const legacyFires = activeWebhooks.map(async (webhook) => {
      const startTime = Date.now()
      try {
        const secret = webhook.secret || process.env.WEBHOOK_SIGNING_SECRET || 'leadsmind_webhook_secret'
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
        const latency = Date.now() - startTime

        // Log delivery attempt
        const payloadWithLatency = { ...payload, latency_ms: latency }
        await supabase.from('webhook_delivery_logs').insert({
          webhook_id: webhook.id,
          workspace_id: workspaceId,
          event,
          payload: payloadWithLatency,
          response_status: res.status,
          success: res.ok,
          delivered_at: new Date().toISOString(),
        })

      } catch (err: any) {
        const latency = Date.now() - startTime
        // Log failure
        const payloadWithLatency = { ...payload, latency_ms: latency }
        await supabase.from('webhook_delivery_logs').insert({
          webhook_id: webhook.id,
          workspace_id: workspaceId,
          event,
          payload: payloadWithLatency,
          response_status: 0,
          success: false,
          error_message: err.message,
          delivered_at: new Date().toISOString(),
        })
      }
    })

    // 4) Fire Zapier webhooks in parallel
    const zapierFires = (zapierSubs || []).map(async (sub) => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

        await fetch(sub.target_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'LeadsMind-Zapier-Webhook/1.0',
            'x-leadsmind-event': event,
          },
          body: payloadString,
          signal: controller.signal,
        })

        clearTimeout(timeout)
      } catch (err: any) {
        console.error(`[zapier-webhook-dispatch] Failed to send to ${sub.target_url}:`, err.message)
      }
    })

    // Fire all without waiting (non-blocking)
    Promise.allSettled([...legacyFires, ...zapierFires]).catch(() => {})

  } catch (err) {
    console.error('[webhook-dispatcher]', err)
  }
}
