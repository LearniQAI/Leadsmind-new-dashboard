import { inngest } from '@/lib/inngest'

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

// Enqueues delivery onto the Inngest queue instead of firing webhook
// requests inline. The request cycle only pays for the enqueue call
// (a few ms); actual HTTP delivery, signing, retries and logging happen
// in the `webhook-dispatch` Inngest function (see
// src/lib/inngest/functions/webhookDispatch.ts). This also avoids the
// serverless failure mode where a fire-and-forget fetch gets killed the
// moment the response is sent, silently dropping the webhook.
export async function dispatchWebhook(
  workspaceId: string,
  event: WebhookEvent,
  data: Record<string, any>
): Promise<void> {
  try {
    await inngest.send({
      name: 'webhook/dispatch',
      data: { workspaceId, event, data },
    })
  } catch (err) {
    console.error('[webhook-dispatcher]', err)
  }
}
