import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { message, sender_type, is_internal_note, attachments, audioUrl, duration } = body;
    
    if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

    const supabase = await createServerClient();
    
    // Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    // Fetch the ticket to get workspace_id and contact_id
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*, contact:contacts(*)')
      .eq('id', params.id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const customAttachments = [];
    if (audioUrl) {
      customAttachments.push({ type: 'audio', url: audioUrl, duration });
    }
    if (attachments && Array.isArray(attachments)) {
      customAttachments.push(...attachments);
    }

    const { data: reply, error } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: params.id,
        workspace_id: ticket.workspace_id,
        contact_id: ticket.contact_id,
        sender_type: sender_type || (userId ? 'agent' : 'customer'),
        sender_id: userId || null,
        message,
        is_internal_note: is_internal_note || false,
        attachments: customAttachments
      })
      .select()
      .single();

    if (error) throw error;

    // Notifications logic
    if (!is_internal_note) {
      if (sender_type === 'agent' && ticket.contact?.email) {
        // Send email to customer
        try {
          await resend.emails.send({
            from: 'Support Desk <support@leadsmind.io>',
            to: ticket.contact.email,
            replyTo: `ticket+${ticket.id}@support.leadsmind.io`,
            subject: `Re: ${ticket.title}`,
            headers: {
              'In-Reply-To': `<ticket-${ticket.id}@support.leadsmind.io>`,
              'References': `<ticket-${ticket.id}@support.leadsmind.io>`
            },
            html: `<p>Hi ${ticket.contact.first_name || 'there'},</p><p>An agent has replied to your ticket:</p><blockquote style="border-left: 4px solid #ddd; padding-left: 1rem; color: #555;">${message}</blockquote><p>Best,<br/>The Support Team</p>`
          });
        } catch (e) {
          console.error('Failed to send resend email to customer:', e);
        }
      }
    }

    return NextResponse.json({ success: true, reply });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
