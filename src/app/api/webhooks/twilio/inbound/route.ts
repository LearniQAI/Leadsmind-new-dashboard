import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fromPhone = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;

    console.log(`[Twilio Inbound] Received SMS from ${fromPhone}: "${body}"`);

    if (!fromPhone || !body) {
      return new NextResponse('<Response></Response>', {
        status: 200,
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // 1. Find the contact by phone
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('id, workspace_id')
      .eq('phone', fromPhone)
      .limit(1)
      .single();

    if (!contact) {
      console.warn(`[Twilio Inbound] No contact found for ${fromPhone}. Cannot route email.`);
      return new NextResponse('<Response></Response>', { status: 200, headers: { 'Content-Type': 'text/xml' } });
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
      console.log(`[Twilio Inbound] Relaying SMS back to email: ${targetEmail}`);
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
        
        console.log('[Twilio Inbound] Successfully relayed SMS to email via Resend.');
      } catch (emailErr) {
        console.error('[Twilio Inbound] Failed to send email via Resend:', emailErr);
      }
    } else {
      console.log(`[Twilio Inbound] No previous sender_email found in conversation. SMS logged but not relayed via email.`);
    }

    // Twilio requires TwiML XML response
    return new NextResponse('<Response></Response>', {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('[Twilio Inbound] Unhandled error:', error);
    return new NextResponse('<Response></Response>', {
      status: 200, // Return 200 even on error so Twilio doesn't retry endlessly or send an error SMS to the user
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}
