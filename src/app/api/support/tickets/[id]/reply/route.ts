import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { message, is_internal_note, attachments, audioUrl, duration } = body;

    if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

    const supabase = await createServerClient();

    // Fetch the ticket (admin client — the caller's own authorization is resolved below,
    // not delegated to RLS) to get the real workspace_id and contact_id.
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('*, contact:contacts(*)')
      .eq("id", params.id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Resolve the caller's real role for THIS ticket's workspace — never trust a
    // client-supplied sender_type/is_internal_note, which previously let anyone (even
    // unauthenticated) flip the DB client used for the insert by simply passing
    // sender_type: 'customer', bypassing RLS entirely regardless of who they were.
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;

    let isAgent = false;
    if (userId) {
      const { data: membership } = await supabaseAdmin
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', ticket.workspace_id)
        .eq('user_id', userId)
        .maybeSingle();
      isAgent = !!membership;
    }

    // Anyone without a verified membership in this ticket's workspace is treated as the
    // public customer reply path — the ticket UUID (known only from the emailed thread
    // link, same model as the public thread page) is the sole access proof for that path.
    const senderType = isAgent ? 'agent' : 'customer';
    const senderId = isAgent ? userId : null;
    const isInternalNote = isAgent ? !!is_internal_note : false;

    const customAttachments = [];
    if (audioUrl) {
      customAttachments.push({ type: 'audio', url: audioUrl, duration });
    }
    if (attachments && Array.isArray(attachments)) {
      customAttachments.push(...attachments);
    }

    const { data: reply, error } = await supabaseAdmin
      .from('support_ticket_messages')
      .insert({
        ticket_id: params.id,
        workspace_id: ticket.workspace_id,
        contact_id: ticket.contact_id,
        sender_type: senderType,
        sender_id: senderId,
        message,
        is_internal_note: isInternalNote,
        attachments: customAttachments
      })
      .select()
      .single();

    if (error) throw error;

    // Notifications logic
    if (!isInternalNote) {
      if (senderType === 'agent' && ticket.contact?.email) {
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
            html: `<p>Hi ${ticket.contact.first_name || 'there'},</p><p>An agent has replied to your ticket:</p><blockquote style="border-left: 4px solid #ddd; padding-left: 1rem; color: #555;">${message}</blockquote><p>You can view and reply to the ticket thread online here: <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/support/public-thread?id=${ticket.id}">View Ticket Thread</a></p><p>Best,<br/>The Support Team</p>`
          });
        } catch (e) {
          console.error('Failed to send resend email to customer:', e);
        }
      }
    }

    return NextResponse.json({ success: true, reply });
  } catch (error: any) {
    console.error('[support.tickets.reply] failed:', error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
