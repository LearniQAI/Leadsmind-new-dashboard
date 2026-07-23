import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { Resend } from 'resend';
import { logger } from '@/shared/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

function extractTicketId(emailAddress: string): string | null {
  // ticket+<uuid>@...
  const match = emailAddress.match(/ticket\+([a-fA-F0-9-]+)@/i);
  return match ? match[1] : null;
}

function verifySignature(req: Request, rawBody: string): boolean {
  const signature = req.headers.get('svix-signature');
  const timestamp = req.headers.get('svix-timestamp');
  const msgId = req.headers.get('svix-id');
  if (!signature || !timestamp || !msgId) return false;
  
  // Minimal replay protection
  const now = Math.floor(Date.now() / 1000);
  if (now - parseInt(timestamp, 10) > 300) return false;

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('[FATAL] RESEND_WEBHOOK_SECRET is not configured');
  }

  const signedContent = `${msgId}.${timestamp}.${rawBody}`;
  const secretBytes = Buffer.from(secret.split('_')[1], 'base64');
  const expectedSig = crypto
    .createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64');
  
  const passedSigs = signature.split(' ').map(s => s.split(',')[1]);
  return passedSigs.includes(expectedSig);
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    // Validate Signature
    if (!verifySignature(req, rawBody)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    if (payload.type !== 'email.received') {
      return NextResponse.json({ success: true });
    }

    const { to, from, subject, text, html, attachments } = payload.data;
    
    // Extract Ticket ID
    let ticketId = null;
    for (const address of to) {
      ticketId = extractTicketId(address);
      if (ticketId) break;
    }

    if (!ticketId) {
      return NextResponse.json({ error: 'No ticket ID found in recipient' }, { status: 400 });
    }

    // Look up ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('*, contact:contacts(*)')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Basic email stripping (strip quoted replies)
    const cleanBody = (text || html || '').split('\n>')[0].split('On ')[0].trim();

    // Prevent duplicate webhook processing
    const webhookId = payload.id;
    const { data: existingMsg } = await supabaseAdmin
      .from('support_ticket_messages')
      .select('id')
      .eq('ticket_id', ticketId)
      .eq('message', cleanBody)
      .limit(1);

    if (existingMsg && existingMsg.length > 0) {
      return NextResponse.json({ success: true, note: 'Duplicate skipped' });
    }

    // Process attachments
    const uploadedAttachments = [];
    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        if (att.content && att.content.length > 25 * 1024 * 1024) continue; // Skip > 25MB
        const buffer = Buffer.from(att.content, 'base64');
        const fileName = att.filename;
        const filePath = `${ticket.workspace_id}/${ticketId}/${Date.now()}_${fileName}`;
        
        const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
          .from('support-ticket-files')
          .upload(filePath, buffer, { contentType: att.content_type });
          
        if (!uploadErr && uploadData) {
          uploadedAttachments.push({
            ticket_id: ticketId,
            workspace_id: ticket.workspace_id,
            file_name: fileName,
            file_size: buffer.length,
            mime_type: att.content_type,
            storage_path: uploadData.path
          });
        }
      }
    }

    // Insert Message
    const { data: newMessage, error: msgError } = await supabaseAdmin
      .from('support_ticket_messages')
      .insert({
        ticket_id: ticketId,
        workspace_id: ticket.workspace_id,
        contact_id: ticket.contact_id,
        sender_type: 'customer',
        message: cleanBody || '[No message body]'
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // Link Attachments
    if (uploadedAttachments.length > 0) {
      for (const ua of uploadedAttachments) {
        ua.message_id = newMessage.id;
      }
      await supabaseAdmin.from('ticket_attachments').insert(uploadedAttachments);
    }

    // Update Ticket Timestamp
    await supabaseAdmin
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    // 1. Log contact activity on CRM timeline
    try {
      await supabaseAdmin.from('contact_activities').insert({
        workspace_id: ticket.workspace_id,
        contact_id: ticket.contact_id,
        type: 'support_message',
        description: `Customer replied to ticket: "${ticket.title}"`,
        metadata: {
          ticket_id: ticketId,
          message_id: newMessage.id,
          channel: 'email'
        }
      });
    } catch (err) {
      logger.error({ err, ticketId }, 'webhook.support_inbound.crm_activity_log.failed');
    }

    // 2. Notify agents/owner of customer reply (via Email and In-App)
    try {
      const { getWorkspaceNotificationRecipients, createInAppNotification } = await import('@/lib/support-helper');
      const { emails: recipients, uids } = await getWorkspaceNotificationRecipients(ticket.workspace_id, ticket.assigned_to);
      
      if (recipients.length > 0) {
        await resend.emails.send({
          from: 'Support Desk <support@leadsmind.io>',
          to: recipients,
          subject: `[Reply Received] Re: ${ticket.title}`,
          html: `<p>A customer has replied to ticket <strong>#${ticketId.substring(0,8)}</strong>.</p><p><strong>Message:</strong></p><p>${cleanBody || '[No message body]'}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/support/tickets?id=${ticketId}">View Ticket Thread</a></p>`
        });
      }

      if (uids.length > 0) {
        await Promise.all(uids.map(uid =>
          createInAppNotification(
            uid,
            `Customer Reply: ${ticket.title}`,
            cleanBody || 'New message on ticket thread',
            `/support/tickets?id=${ticketId}`
          )
        ));
      }
    } catch (e) {
      logger.error({ err: e, ticketId }, 'webhook.support_inbound.agent_notification.failed');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, 'webhook.support_inbound.failed');
    return NextResponse.json({ error: 'Support ticket webhook processing failed.' }, { status: 500 });
  }
}
