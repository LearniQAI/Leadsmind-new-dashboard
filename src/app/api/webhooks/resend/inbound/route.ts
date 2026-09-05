import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/sms';
import { logger } from '@/shared/logger';
import { extractWorkspaceSlugFromAddress } from '@/lib/email/inboundAddress';
import { resolveInboundEmailContent, deadLetterResendEvent, insertWebhookDeadLetter, handleInboundWorkspaceEmail } from '@/lib/email/inboundEmailProcessing';

export const runtime = 'nodejs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const headers = {
      'svix-id': req.headers.get('svix-id') || '',
      'svix-timestamp': req.headers.get('svix-timestamp') || '',
      'svix-signature': req.headers.get('svix-signature') || '',
    };

    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
      logger.error({}, 'webhook.resend_inbound.secret.missing');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const wh = new Webhook(secret);
    let event: any;

    try {
      event = wh.verify(payload, headers);
    } catch (err: any) {
      logger.error({ err }, 'webhook.resend_inbound.verification.failed');
      await deadLetterResendEvent({ headers, body: payload }, err.message, 'verification_failed', 'dropped');
      return NextResponse.json({ error: 'Verification failed' }, { status: 200 }); // Return 200 to drop
    }

    if (event.type === 'email.received') {
      const emailData = event.data;
      const from = emailData.from;
      const toArray = Array.isArray(emailData.to) ? emailData.to : (emailData.to ? [emailData.to] : []);
      const toAddresses = [...toArray];

      if (emailData.headers?.['Delivered-To']) toAddresses.push(emailData.headers['Delivered-To']);
      if (emailData.headers?.['X-Forwarded-To']) toAddresses.push(emailData.headers['X-Forwarded-To']);

      let messageId = String(emailData.headers?.['Message-ID'] || emailData.id || '').trim();
      if (!messageId) {
        logger.error({}, 'webhook.resend_inbound.message_id.missing');
        await deadLetterResendEvent(emailData, 'Missing Message-ID', 'validation_failed', 'dropped');
        return NextResponse.json({ received: true, error: 'Missing Message-ID ignored' }, { status: 200 });
      }

      // --- Email Channel Part 1: does this address belong to a workspace's ---
      // --- real inbound alias ({slug}@INBOUND_EMAIL_DOMAIN)? Checked FIRST ---
      // --- and returns early — the existing +phone@sms.leadsmind.io bridge ---
      // --- below is completely untouched and only reached when no ---
      // --- workspace alias matches. ---
      let workspaceSlug: string | null = null;
      for (const address of toAddresses) {
        workspaceSlug = extractWorkspaceSlugFromAddress(address);
        if (workspaceSlug) break;
      }

      if (workspaceSlug) {
        const { data: existingMsg } = await supabaseAdmin
          .from('messages')
          .select('id')
          .eq('bridge_metadata->>resend_message_id', messageId)
          .limit(1)
          .single();

        if (existingMsg) {
          logger.warn({ messageId, workspaceSlug }, 'webhook.resend_inbound.email_channel.duplicate_message_skipped');
          return NextResponse.json({ received: true, duplicate: true });
        }

        await handleInboundWorkspaceEmail({ emailData, from, messageId, workspaceSlug });
        return NextResponse.json({ received: true });
      }

      // --- Existing Email→SMS bridge (unchanged) -----------------------------
      // Extract target phone number robustly
      let targetPhone = '';
      for (const address of toAddresses) {
        if (!address) continue;
        const phoneMatch = String(address).match(/(\+?\d+)@sms\.leadsmind\.io/i);
        if (phoneMatch) {
          targetPhone = phoneMatch[1];
          break;
        }
      }

      if (!targetPhone) {
        logger.error({ toAddresses }, 'webhook.resend_inbound.target_address.invalid');
        await deadLetterResendEvent(emailData, 'Invalid target address format', 'validation_failed', 'dropped');
        return NextResponse.json({ received: true, error: 'Invalid target address ignored' }, { status: 200 });
      }

      // Duplicate Webhook Protection
      const { data: existingMsg } = await supabaseAdmin
        .from('messages')
        .select('id')
        .eq('bridge_metadata->>resend_message_id', messageId)
        .limit(1)
        .single();

      if (existingMsg) {
        logger.warn({ messageId }, 'webhook.resend_inbound.duplicate_message_skipped');
        return NextResponse.json({ received: true, duplicate: true });
      }

      // 1-4. Fetch + clean + combine the email body (shared helper).
      const { rawText } = await resolveInboundEmailContent(emailData);
      const forcedMessage = rawText || '[BODY COMPLETELY EMPTY]';

      if (!rawText && forcedMessage === '[BODY COMPLETELY EMPTY]') {
        logger.error({}, 'webhook.resend_inbound.body.empty');
        await deadLetterResendEvent(emailData, 'Empty body after strip', 'validation_failed', 'dropped');
        return NextResponse.json({ received: true, error: 'Empty message body ignored' }, { status: 200 });
      }

      // 5. Pre-dispatch persistence: Find contact, conversation, and insert message
      const { data: contact } = await supabaseAdmin
        .from('contacts')
        .select('id, workspace_id')
        .eq('phone', targetPhone)
        .limit(1)
        .single();

      let dbMessageId = null;

      if (contact) {
        let conversationId = null;

        // Find existing SMS conversation
        const { data: conv } = await supabaseAdmin
          .from('conversations')
          .select('id')
          .eq('contact_id', contact.id)
          .eq('platform', 'sms')
          .limit(1)
          .single();

        if (conv) {
          conversationId = conv.id;
          await supabaseAdmin
            .from('conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', conversationId);
        } else {
          // Create new conversation
          const { data: newConv } = await supabaseAdmin
            .from('conversations')
            .insert({
              workspace_id: contact.workspace_id,
              contact_id: contact.id,
              platform: 'sms',
              title: 'SMS Conversation',
              last_message_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (newConv) conversationId = newConv.id;
        }

        if (conversationId) {
          // INSERT BEFORE DISPATCH
          const { data: insertedMsg, error: insertErr } = await supabaseAdmin
            .from('messages')
            .insert({
              workspace_id: contact.workspace_id,
              conversation_id: conversationId,
              direction: 'outbound',
              content: forcedMessage,
              status: 'sending',
              bridge_metadata: {
                resend_message_id: messageId,
                sender_email: from
              }
            }).select('id').single();

          if (insertErr) {
             logger.error({ err: insertErr }, 'webhook.resend_inbound.predispatch_persistence.failed');
             throw insertErr; // Will trigger 500 infra retry
          }
          if (insertedMsg) dbMessageId = insertedMsg.id;
        }
      } else {
         logger.warn({ targetPhone }, 'webhook.resend_inbound.contact_not_found');
      }

      // 6. Dispatch SMS
      let smsSid = '';
      let smsStatus = 'sent';
      let smsError = null;

      try {
        if (!process.env.TWILIO_PHONE_NUMBER) {
           throw new Error('TWILIO_PHONE_NUMBER is missing from Vercel Environment Variables');
        }
        const smsResult = await sendSMS({ to: targetPhone, message: forcedMessage });
        smsSid = smsResult.sid;
      } catch (smsErr: any) {
        logger.error({ err: smsErr, targetPhone }, 'webhook.resend_inbound.twilio_sms.failed');
        smsStatus = 'failed';
        smsError = smsErr.message;
      }

      // 7. Update post-dispatch state
      if (dbMessageId) {
         await supabaseAdmin.from('messages').update({
            status: smsStatus,
            // messages has no error_message column — fold the failure reason into bridge_metadata
            bridge_metadata: {
                resend_message_id: messageId,
                sender_email: from,
                twilio_sid: smsSid || undefined,
                error_message: smsError || undefined
            }
         }).eq('id', dbMessageId);
      }

      if (smsStatus === 'failed') {
         logger.error({ smsError, targetPhone }, 'webhook.resend_inbound.sms_relay.failed');
         await insertWebhookDeadLetter('twilio_outbound', { to: targetPhone, message: forcedMessage }, String(smsError), 'operational_failure', 'dropped');
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    logger.error({ err: error }, 'webhook.resend_inbound.failed');
    // Transient infrastructure failure (e.g. DB down) -> return 500 to invoke Resend's backoff retry
    return NextResponse.json({ error: 'Infrastructure failure' }, { status: 500 });
  }
}
