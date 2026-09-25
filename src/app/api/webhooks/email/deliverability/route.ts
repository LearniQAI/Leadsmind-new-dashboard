import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/shared/logger';
import { ResendProvider } from '@/lib/email/provider/resend';
import { handleDeliverabilityEvent } from '@/lib/email/deliverabilityWebhook';

export const runtime = 'nodejs';

/**
 * Resend delivery-lifecycle events (sent / delivered / delayed / bounced / complained / opened /
 * clicked / failed) and domain.updated, for mail sent through the PLATFORM Resend account. One
 * account means one webhook signing secret: RESEND_WEBHOOK_SECRET. The same events are also
 * accepted on /api/webhooks/resend/inbound, so the platform's existing webhook can carry them.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    logger.error({}, 'webhook.email_deliverability.secret.missing');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const rawBody = await req.text();
  const headers = {
    'svix-id': req.headers.get('svix-id') || '',
    'svix-timestamp': req.headers.get('svix-timestamp') || '',
    'svix-signature': req.headers.get('svix-signature') || '',
  };

  let event;
  try {
    // Only the verifier is needed here, so any key works for constructing the provider.
    event = new ResendProvider(process.env.RESEND_API_KEY || 'verify-only').parseWebhook(rawBody, headers, secret);
  } catch (err: any) {
    logger.warn({ err }, 'webhook.email_deliverability.signature.invalid');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  return handleDeliverabilityEvent(event);
}
