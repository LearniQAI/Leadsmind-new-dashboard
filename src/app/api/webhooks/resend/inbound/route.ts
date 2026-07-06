import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/sms';
import { logger } from '@/shared/logger';

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
      try {
        await supabaseAdmin.from('webhook_dead_letters').insert({
           provider: 'resend', payload: { headers, body: payload }, error: err.message, error_type: 'verification_failed', retry_state: 'dropped'
        });
      } catch (dbErr: any) {
        logger.error({ err: dbErr, provider: 'resend' }, 'webhook.resend_inbound.dead_letter_insert.failed');
      }
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
        try {
          await supabaseAdmin.from('webhook_dead_letters').insert({
             provider: 'resend', payload: emailData, error: 'Missing Message-ID', error_type: 'validation_failed', retry_state: 'dropped'
          });
        } catch (dbErr: any) {
          logger.error({ err: dbErr, provider: 'resend' }, 'webhook.resend_inbound.dead_letter_insert.failed');
        }
        return NextResponse.json({ received: true, error: 'Missing Message-ID ignored' }, { status: 200 });
      }
      
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
        await supabaseAdmin.from('webhook_dead_letters').insert({
           provider: 'resend', payload: emailData, error: 'Invalid target address format', error_type: 'validation_failed', retry_state: 'dropped'
        });
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
      // Inbound webhooks do NOT contain the body. We must fetch it using the email_id.
      // Note: Test events from the Resend Dashboard will return 404 because the fake ID doesn't exist.
      let fetchedText = '';
      let fetchedHtml = '';
      if (emailData.email_id) {
        try {
          const resendResponse = await fetch(`https://api.resend.com/emails/receiving/${emailData.email_id}`, {
            headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` }
          });
          
          if (resendResponse.ok) {
            const emailJson = await resendResponse.json();
            fetchedText = emailJson.text || '';
            fetchedHtml = emailJson.html || '';
          } else {
            logger.error({ status: resendResponse.status }, 'webhook.resend_inbound.receiving_api.failed');
          }
        } catch (err) {
           logger.error({ err }, 'webhook.resend_inbound.email_fetch.failed');
        }
      }

      // 2. Extract body
      let bodyText = '';
      if (fetchedText && fetchedText.trim().length > 0) {
        bodyText = fetchedText.trim();
      } else if (fetchedHtml && fetchedHtml.trim().length > 0) {
        bodyText = fetchedHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      } else if (emailData.text) {
        bodyText = emailData.text.trim();
      } else if (emailData.html) {
        bodyText = emailData.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }

      // 3. Clean message body (strip forwarded quotes and signatures)
      if (bodyText) {
        bodyText = bodyText.split(/On\s+.*wrote:/i)[0]; // Gmail style
        bodyText = bodyText.split(/From:/i)[0]; // Outlook style
        bodyText = bodyText.split(/_{10,}/)[0]; // Underscore separators
        bodyText = bodyText.trim();
      }

      // 4. Combine Subject and Body
      let rawText = '';
      if (emailData.subject && bodyText) {
        rawText = `Subj: ${emailData.subject}\n\n${bodyText}`;
      } else if (bodyText) {
        rawText = bodyText;
      } else if (emailData.subject) {
        rawText = `Subj: ${emailData.subject}`;
      }

      const forcedMessage = rawText || '[BODY COMPLETELY EMPTY]';

      if (!rawText && forcedMessage === '[BODY COMPLETELY EMPTY]') {
        logger.error({}, 'webhook.resend_inbound.body.empty');
        await supabaseAdmin.from('webhook_dead_letters').insert({
           provider: 'resend', payload: emailData, error: 'Empty body after strip', error_type: 'validation_failed', retry_state: 'dropped'
        });
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
            error_message: smsError,
            bridge_metadata: {
                resend_message_id: messageId,
                sender_email: from,
                twilio_sid: smsSid || undefined
            }
         }).eq('id', dbMessageId);
      }

      if (smsStatus === 'failed') {
         logger.error({ smsError, targetPhone }, 'webhook.resend_inbound.sms_relay.failed');
         try {
           await supabaseAdmin.from('webhook_dead_letters').insert({
              provider: 'twilio_outbound', payload: { to: targetPhone, message: forcedMessage }, error: String(smsError), error_type: 'operational_failure', retry_state: 'dropped'
           });
         } catch(dbErr: any) {
           logger.error({ err: dbErr, provider: 'twilio_outbound' }, 'webhook.resend_inbound.dead_letter_insert.failed');
         }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    logger.error({ err: error }, 'webhook.resend_inbound.failed');
    // Transient infrastructure failure (e.g. DB down) -> return 500 to invoke Resend's backoff retry
    return NextResponse.json({ error: 'Infrastructure failure' }, { status: 500 });
  }
}
