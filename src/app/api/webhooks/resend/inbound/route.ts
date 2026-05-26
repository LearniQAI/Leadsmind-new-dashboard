import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/sms';

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
      console.error('[Resend Webhook] Missing RESEND_WEBHOOK_SECRET');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const wh = new Webhook(secret);
    let event: any;

    try {
      event = wh.verify(payload, headers);
    } catch (err: any) {
      console.error('[Resend Webhook] Verification failed:', err.message);
      return NextResponse.json({ error: 'Verification failed' }, { status: 401 });
    }

    if (event.type === 'email.received') {
      const emailData = event.data;
      const from = emailData.from;
      const toArray = Array.isArray(emailData.to) ? emailData.to : [emailData.to];
      const to = toArray[0] || '';
      
      const messageId = emailData.headers?.['Message-ID'] || emailData.id || `resend_${Date.now()}`;
      
      // Extract target phone number
      const phoneMatch = to.match(/(\+?\d+)@sms\.leadsmind\.io/i);
      if (!phoneMatch) {
        console.error(`[Resend Webhook] Invalid target address format: ${to}`);
        return NextResponse.json({ error: 'Invalid target address' }, { status: 400 });
      }
      const targetPhone = phoneMatch[1];

      // Clean message body (fallback to subject if body is completely empty)
      const rawText = emailData.text || emailData.html || emailData.subject || '';
      // Strip signatures and quotes roughly
      const cleanedText = rawText
        .split(/On\s+.*wrote:/i)[0] // English reply quote
        .split(/--- Original Message ---/i)[0]
        .split(/_{10,}/)[0]
        .replace(/<[^>]*>?/gm, '') // Strip HTML tags if fallback used HTML
        .trim();

      if (!cleanedText) {
        console.error('[Resend Webhook] Empty message body after stripping');
        return NextResponse.json({ error: 'Empty message body' }, { status: 400 });
      }

      // Send SMS via existing Twilio infrastructure
      let smsSid = '';
      try {
        console.log(`[Twilio Debug] SID Length: ${process.env.TWILIO_ACCOUNT_SID?.length}, Token Length: ${process.env.TWILIO_AUTH_TOKEN?.length}`);
        console.log(`[Twilio Debug] SID Prefix: ${process.env.TWILIO_ACCOUNT_SID?.substring(0, 4)}`);
        
        const smsResult = await sendSMS({ to: targetPhone, message: cleanedText });
        smsSid = smsResult.sid;
      } catch (smsErr: any) {
        console.error('[Resend Webhook] Twilio SMS failed:', smsErr);
        return NextResponse.json({ error: 'Failed to relay SMS' }, { status: 500 });
      }

      // Resolve CRM contact and log conversation
      const { data: contact } = await supabaseAdmin
        .from('contacts')
        .select('id, workspace_id')
        .eq('phone', targetPhone)
        .limit(1)
        .single();

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
          // Update last_message_at
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
          // Log the message into existing messaging table
          await supabaseAdmin
            .from('messages')
            .insert({
              workspace_id: contact.workspace_id,
              conversation_id: conversationId,
              direction: 'outbound',
              content: cleanedText,
              status: 'sent',
              bridge_metadata: {
                resend_message_id: messageId,
                twilio_sid: smsSid,
                sender_email: from
              }
            });
        }
      } else {
        console.warn(`[Resend Webhook] Contact not found for phone ${targetPhone}, skipping CRM log`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Resend Webhook] Unhandled error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
