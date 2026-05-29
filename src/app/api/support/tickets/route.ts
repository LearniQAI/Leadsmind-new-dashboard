import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workspaceId, name, email, subject, description, priority } = body;

    if (!workspaceId || !email || !subject || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Try to find a contact by email in this workspace
    let contactId = null;
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('email', email)
      .limit(1);

    if (contacts && contacts.length > 0) {
      contactId = contacts[0].id;
    } else {
      // Create contact if not found
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          workspace_id: workspaceId,
          email: email,
          first_name: name?.split(' ')[0] || '',
          last_name: name?.split(' ').slice(1).join(' ') || ''
        })
        .select()
        .single();
        
      if (!contactError && newContact) {
        contactId = newContact.id;
      }
    }

    // Insert Ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        title: subject,
        description: description,
        priority: priority || 'normal',
        status: 'open'
      })
      .select()
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: ticketError?.message || 'Failed to create ticket' }, { status: 500 });
    }

    // Insert Initial Message
    const { error: msgError } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: ticket.id,
        workspace_id: workspaceId,
        contact_id: contactId,
        sender_type: 'customer',
        message: description
      });

    if (msgError) console.error('Failed to insert initial ticket message:', msgError);

    // Send notification
    try {
      await resend.emails.send({
        from: 'Support Desk <support@leadsmind.ai>',
        to: email,
        subject: `Ticket Received: ${subject}`,
        html: `<p>Hi ${name || 'there'},</p><p>We have received your support request regarding "<strong>${subject}</strong>". Our team will be in touch shortly.</p><p>Best,<br/>The Support Team</p>`
      });
    } catch (e) {
      console.error('Failed to send resend email:', e);
    }

    return NextResponse.json({ success: true, ticket });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });

    const supabase = createRouteHandlerClient({ cookies });
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*, contact:contacts(*)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ tickets: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
