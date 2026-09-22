import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/shared/logger';
import { verifyTwilioWebhook } from '@/lib/twilio/verifyWebhook';
import { recordSmsOptOut } from '@/lib/smsOptOut';
import { cancelSmsExecutionsForContacts } from '@/lib/automation/cancelOptOutExecutions';
import { splitChannelPrefix } from '@/lib/phone';

export const runtime = 'nodejs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Twilio delivery-status callback for messages we sent (bulk SMS sets statusCallback to this route).
// Before this existed "sent" only meant Twilio had ACCEPTED a message; carrier-level failures
// (unreachable handset, filtered as spam, recipient blocked) were invisible. Twilio's own field names
// are used as documented: MessageSid, MessageStatus, ErrorCode. Signed like every Twilio webhook, but
// validated by the SENDING number (From), since this is our outbound message.

// Twilio 21610: the recipient replied STOP to Twilio itself (its opt-out list). Treat it exactly like a
// STOP we received: durable opt-out + cancel the contact's running SMS workflows.
const RECIPIENT_UNSUBSCRIBED = '21610';

export async function POST(req: NextRequest) {
  let payload: any = {};
  try {
    const formData = await req.formData();
    formData.forEach((value, key) => { payload[key] = value; });

    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/sms-status`;
    const verdict = await verifyTwilioWebhook(supabaseAdmin, {
      signature: req.headers.get('X-Twilio-Signature'), url, params: payload, numberField: 'From',
    });
    if (!verdict.valid) {
      logger.warn({ workspaceOwned: verdict.workspaceOwned }, 'webhook.twilio_sms_status.signature.invalid');
      try {
        await supabaseAdmin.from('webhook_dead_letters').insert({
          provider: 'twilio_sms_status', payload, error: 'Invalid or missing X-Twilio-Signature', error_type: 'signature_invalid', retry_state: 'dropped',
        });
      } catch (dbErr) {
        logger.error({ err: dbErr }, 'webhook.twilio_sms_status.dead_letter_insert.failed');
      }
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const messageSid = String(payload.MessageSid ?? payload.SmsSid ?? '').trim();
    const status = String(payload.MessageStatus ?? payload.SmsStatus ?? '').trim();
    const errorCode = payload.ErrorCode ? String(payload.ErrorCode) : '';

    // Bulk SMS is always sent from a workspace-owned number; a platform-number callback has no queue row to update.
    if (!verdict.workspaceId || !messageSid || !status) {
      return new NextResponse(null, { status: 204 });
    }

    const { data: result, error } = await supabaseAdmin.rpc('apply_sms_delivery_status', {
      p_workspace_id: verdict.workspaceId,
      p_message_sid: messageSid,
      p_status: status,
      p_error_code: errorCode,
    });
    if (error) throw error;

    if (result?.applied && result.failed && errorCode === RECIPIENT_UNSUBSCRIBED) {
      const { contactIds } = await recordSmsOptOut(supabaseAdmin, {
        workspaceId: verdict.workspaceId,
        phone: splitChannelPrefix(String(payload.To ?? '')).number,
        source: 'twilio_error_21610',
        messageSid,
      });
      try { await cancelSmsExecutionsForContacts(supabaseAdmin as any, verdict.workspaceId, contactIds); } catch (err) {
        logger.error({ err }, 'webhook.twilio_sms_status.cancel_executions.failed');
      }
    }

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    logger.error({ err }, 'webhook.twilio_sms_status.failed');
    try {
      await supabaseAdmin.from('webhook_dead_letters').insert({
        provider: 'twilio_sms_status', payload, error: 'Status processing failed', error_type: 'infrastructure_failure', retry_state: 'unresolved',
      });
    } catch (dbErr) {
      logger.error({ err: dbErr }, 'webhook.twilio_sms_status.dead_letter_insert.failed');
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
