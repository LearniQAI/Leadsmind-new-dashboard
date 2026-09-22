import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/shared/logger';
import { normalizePhone, splitChannelPrefix } from '@/lib/phone';
import { verifyTwilioWebhook } from '@/lib/twilio/verifyWebhook';
import { recordSmsOptOut, clearSmsOptOut } from '@/lib/smsOptOut';
import { cancelSmsExecutionsForContacts } from '@/lib/automation/cancelOptOutExecutions';

export const runtime = 'nodejs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STOP_KEYWORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
const START_KEYWORDS = ['START', 'UNSTOP', 'YES'];
const twiml = (inner = '') => new NextResponse(`<Response>${inner}</Response>`, { status: 200, headers: { 'Content-Type': 'text/xml' } });

export async function POST(req: NextRequest) {
    let payloadObj: any = {};
  try {
    const formData = await req.formData();
    formData.forEach((value, key) => payloadObj[key] = value);

    // Verify this request genuinely came from Twilio BEFORE any state change (see verifyTwilioWebhook:
    // a workspace-owned number is validated with THAT workspace's own token, never the platform token).
    const twilioSignature = req.headers.get('X-Twilio-Signature');
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/inbound`;
    const verdict = await verifyTwilioWebhook(supabaseAdmin, { signature: twilioSignature, url: webhookUrl, params: payloadObj, numberField: 'To' });
    const isValidSignature = verdict.valid;
    const workspaceId: string | null = verdict.workspaceId;

    if (!isValidSignature) {
      logger.warn({ hasSignatureHeader: !!twilioSignature, workspaceOwned: verdict.workspaceOwned }, 'webhook.twilio_inbound.signature.invalid');
      try {
        await supabaseAdmin.from('webhook_dead_letters').insert({
          provider: 'twilio_inbound', payload: payloadObj, error: 'Invalid or missing X-Twilio-Signature', error_type: 'signature_invalid', retry_state: 'dropped'
        });
      } catch (dbErr: any) {
        logger.error({ err: dbErr, provider: 'twilio_inbound' }, 'webhook.twilio_inbound.dead_letter_insert.failed');
      }
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const fromPhone = formData.get('From') as string;
    const body = formData.get('Body') as string;
    let messageSid = String(formData.get('MessageSid') || '').trim();
    if (!messageSid) {
      logger.error({}, 'webhook.twilio_inbound.message_sid.missing');
      try {
        await supabaseAdmin.from('webhook_dead_letters').insert({
           provider: 'twilio_inbound', payload: payloadObj, error: 'Missing MessageSid', error_type: 'validation_failed', retry_state: 'dropped'
        });
      } catch (dbErr: any) {
        logger.error({ err: dbErr, provider: 'twilio_inbound' }, 'webhook.twilio_inbound.dead_letter_insert.failed');
      }
      return twiml();
    }

    logger.info({ workspaceId }, 'webhook.twilio_inbound.sms_received');

    if (!fromPhone || !body) {
      return twiml();
    }

    // SMS opt-out / opt-in. Handled BEFORE the duplicate check and BEFORE any contact lookup: a STOP
    // must win over whatever else the contact is mid-flow on, and must be recorded even when the
    // number is not (yet) a contact -- the durable suppression list (workspace + E.164 phone) is what
    // keeps a later import from silently re-subscribing them. Both operations are idempotent, so a
    // Twilio retry of the same webhook is harmless.
    const keyword = body.trim().replace(/[.!\s]+$/, '').toUpperCase();
    if (STOP_KEYWORDS.includes(keyword)) {
      const { e164, contactIds } = await recordSmsOptOut(supabaseAdmin, { workspaceId, phone: splitChannelPrefix(fromPhone).number, source: 'twilio_inbound', messageSid });
      let cancelled = 0;
      try {
        cancelled = await cancelSmsExecutionsForContacts(supabaseAdmin as any, workspaceId, contactIds);
      } catch (cancelErr) {
        // The opt-out is already durable and the send-time gate in sendSMS is the backstop.
        logger.error({ err: cancelErr, workspaceId }, 'webhook.twilio_inbound.stop.cancel_executions.failed');
      }
      logger.info({ workspaceId, matched: contactIds.length, cancelled, normalized: !!e164 }, 'webhook.twilio_inbound.stop.recorded');
      return twiml('<Message>You have been unsubscribed from marketing messages. Reply START to resubscribe.</Message>');
    }
    if (START_KEYWORDS.includes(keyword)) {
      // Only ever lifts the opt-out inside the workspace that owns the number that was texted.
      if (!workspaceId) return twiml();
      await clearSmsOptOut(supabaseAdmin, { workspaceId, phone: splitChannelPrefix(fromPhone).number });
      return twiml('<Message>You have been resubscribed to marketing messages.</Message>');
    }

    // Duplicate Webhook Protection
    const { data: existingMsg } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('bridge_metadata->>twilio_message_sid', messageSid)
      .limit(1)
      .single();

    if (existingMsg) {
      logger.warn({ messageSid }, 'webhook.twilio_inbound.duplicate_message_skipped');
      return twiml();
    }

    // 1. Find the contact: by normalised E.164 phone, scoped to the workspace that owns the number
    // that was texted (previously: exact-string phone match across ALL workspaces, first row wins).
    const fromE164 = normalizePhone(splitChannelPrefix(fromPhone).number);
    let contactQuery = supabaseAdmin.from('contacts').select('id, workspace_id');
    contactQuery = fromE164 ? contactQuery.eq('phone_e164', fromE164) : contactQuery.eq('phone', fromPhone);
    if (workspaceId) contactQuery = contactQuery.eq('workspace_id', workspaceId);
    const { data: contact } = await contactQuery.limit(1).maybeSingle();

    if (!contact) {
      logger.warn({ workspaceId }, 'webhook.twilio_inbound.contact_not_found');
      return twiml();
    }

    // Intercept "ENROL" command for WhatsApp AI self-service registration
    if (body.trim().toUpperCase().startsWith('ENROL')) {
      const { data: courses } = await supabaseAdmin
        .from('courses')
        .select('id, title')
        .eq('workspace_id', contact.workspace_id);

      if (courses && courses.length > 0) {
        let matchedCourseId = null;
        let matchedCourseTitle = '';

        const openAiKey = process.env.OPENAI_API_KEY;
        if (openAiKey && !openAiKey.startsWith('sk_mock_key') && !openAiKey.includes('PLACEHOLDER') && !openAiKey.startsWith('sk-proj-O15jtbs')) {
          try {
            const prompt = `You are LENA AI. Identify which course the user wants to enroll in.
User Message: "${body}"
Available Courses:
${courses.map(c => `- ID: ${c.id}, Title: ${c.title}`).join('\n')}

Reply with ONLY the matching course UUID. If there is no clear match, reply with "NONE".`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openAiKey}`
              },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1
              })
            });

            if (response.ok) {
              const resData = await response.json();
              const matchedText = resData.choices?.[0]?.message?.content?.trim() || '';
              if (matchedText && matchedText !== 'NONE') {
                const found = courses.find(c => c.id === matchedText);
                if (found) {
                  matchedCourseId = found.id;
                  matchedCourseTitle = found.title;
                }
              }
            }
          } catch (err) {
            logger.error({ err, contactId: contact.id }, 'webhook.twilio_inbound.openai_course_resolution.failed');
          }
        }

        // Fallback: substring matching
        if (!matchedCourseId) {
          const cleanQuery = body.replace(/ENROL/i, '').trim().toLowerCase();
          const found = courses.find(c => c.title.toLowerCase().includes(cleanQuery) || cleanQuery.includes(c.title.toLowerCase()));
          if (found) {
            matchedCourseId = found.id;
            matchedCourseTitle = found.title;
          }
        }

        if (matchedCourseId) {
          await supabaseAdmin
            .from('enrollments')
            .upsert({
              course_id: matchedCourseId,
              contact_id: contact.id,
              status: 'active',
              access_type: 'full',
              metadata: { enrolled_via: 'whatsapp_ai' }
            }, { onConflict: 'course_id,contact_id' });

          const { publishEvent } = await import('@/lib/events/EventBus');
          await publishEvent(contact.workspace_id, 'student_enrolled_course', contact.id, {
            courseId: matchedCourseId,
            via: 'whatsapp_ai'
          });

          return new NextResponse(
            `<Response><Message>🤖 *LENA AI*: Welcome! You have been successfully enrolled in *${matchedCourseTitle}*. Start learning today! 🚀</Message></Response>`,
            { status: 200, headers: { 'Content-Type': 'text/xml' } }
          );
        }
      }

      return new NextResponse(
        `<Response><Message>🤖 *LENA AI*: Sorry, I couldn't match that to any available course. Please reply with "ENROL <course name>" with the exact course title.</Message></Response>`,
        { status: 200, headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // 2. Find the active SMS conversation
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('contact_id', contact.id)
      .eq('platform', 'sms')
      .limit(1)
      .single();

    let conversationId = conv?.id;

    if (!conversationId) {
      // If no conversation exists, create one
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
    } else {
      // Update last message time
      await supabaseAdmin
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    }

    // 3. Find the original sender_email from the last bridged message
    let targetEmail = '';
    if (conversationId) {
      const { data: lastBridgedMsg } = await supabaseAdmin
        .from('messages')
        .select('bridge_metadata')
        .eq('conversation_id', conversationId)
        .not('bridge_metadata', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastBridgedMsg && lastBridgedMsg.bridge_metadata && typeof lastBridgedMsg.bridge_metadata === 'object') {
        const metadata = lastBridgedMsg.bridge_metadata as any;
        if (metadata.sender_email) {
          targetEmail = metadata.sender_email;
        }
      }
    }

    // 4. Log the inbound SMS to the database
    let dbMessageId = null;
    if (conversationId) {
      const { data: insertedMsg } = await supabaseAdmin
        .from('messages')
        .insert({
          workspace_id: contact.workspace_id,
          conversation_id: conversationId,
          direction: 'inbound',
          content: body,
          status: 'delivered',
          bridge_metadata: {
            twilio_message_sid: messageSid,
            forwarded_to_email: targetEmail || null
          }
        })
        .select('id')
        .single();
      
      if (insertedMsg) dbMessageId = insertedMsg.id;
    }

    // 5. Send Email via Resend if we found a target
    if (targetEmail) {
      logger.info({ targetEmail }, 'webhook.twilio_inbound.email_relay.start');
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY!);
        
        // Try to construct a realistic from address, fallback to default
        const cleanPhone = fromPhone.replace('+', '');
        const fromAddress = process.env.RESEND_FROM_EMAIL || `${cleanPhone}@sms.leadsmind.io`;

        await resend.emails.send({
          from: fromAddress,
          to: targetEmail,
          subject: `New SMS Reply from ${fromPhone}`,
          text: body,
        });
        
        logger.info({ targetEmail }, 'webhook.twilio_inbound.email_relay.success');
      } catch (emailErr: any) {
        logger.error({ err: emailErr, targetEmail }, 'webhook.twilio_inbound.email_relay.failed');
        try {
          await supabaseAdmin.from('webhook_dead_letters').insert({
              provider: 'resend_outbound_relay', payload: { to: targetEmail, body }, error: String(emailErr.message), error_type: 'operational_failure', retry_state: 'dropped'
          });
        } catch(dbErr: any) {
          logger.error({ err: dbErr, provider: 'resend_outbound_relay' }, 'webhook.twilio_inbound.dead_letter_insert.failed');
        }
      }
    } else {
      logger.info({}, 'webhook.twilio_inbound.no_relay_target');
    }

    // Twilio requires TwiML XML response
    return new NextResponse('<Response></Response>', {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'webhook.twilio_inbound.failed');

    try {
      await supabaseAdmin.from('webhook_dead_letters').insert({
         provider: 'twilio_inbound', payload: payloadObj, error: error.message, error_type: 'infrastructure_failure', retry_state: 'pending'
      });
    } catch (dbErr: any) {
      logger.error({ err: dbErr, provider: 'twilio_inbound' }, 'webhook.twilio_inbound.dead_letter_insert.failed');
    }

    // Transient infrastructure failure -> return 500 so Twilio invokes retry backoff
    return new NextResponse('<Response></Response>', {
      status: 500,
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}
