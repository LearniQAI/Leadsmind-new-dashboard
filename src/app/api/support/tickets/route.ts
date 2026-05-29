import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Basic IP rate limiting memory store
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const rateData = rateLimitMap.get(ip) || { count: 0, lastReset: now };
    
    if (now - rateData.lastReset > RATE_LIMIT_WINDOW) {
      rateData.count = 1;
      rateData.lastReset = now;
    } else {
      rateData.count++;
      if (rateData.count > MAX_REQUESTS) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
    }
    rateLimitMap.set(ip, rateData);

    const body = await req.json();
    const { workspaceId, name, email, subject, description, priority } = body;

    // ... Validation ...
    if (!workspaceId || !email || !subject || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createServerClient();

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
        from: 'Support Desk <support@leadsmind.io>',
        to: email,
        replyTo: `ticket+${ticket.id}@support.leadsmind.io`,
        subject: `Ticket Received: ${subject}`,
        headers: {
          'Message-ID': `<ticket-${ticket.id}@support.leadsmind.io>`
        },
        html: `<p>Hi ${name || 'there'},</p><p>We have received your support request regarding "<strong>${subject}</strong>". Our team will be in touch shortly.</p><p>Best,<br/>The Support Team</p>`
      });

      // Notify Workspace Admins and Owner (and Assigned Agent if any)
      const { getWorkspaceNotificationRecipients, createInAppNotification } = await import('@/lib/support-helper');
      const { emails: recipients, uids } = await getWorkspaceNotificationRecipients(workspaceId, ticket.assigned_to);
      
      if (recipients.length > 0) {
        await resend.emails.send({
          from: 'Support Desk <support@leadsmind.io>',
          to: recipients,
          subject: `[New Ticket] ${subject}`,
          html: `<p>A new support ticket has been created in your workspace.</p><p><strong>From:</strong> ${email}</p><p><strong>Subject:</strong> ${subject}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/support/tickets?id=${ticket.id}">View Ticket Thread</a></p>`
        });
      }

      // Send in-app notifications
      if (uids.length > 0) {
        await Promise.all(uids.map(uid => 
          createInAppNotification(
            uid,
            `New Support Ticket: ${subject}`,
            `Ticket #${ticket.id.substring(0,8)} created by ${name || email}`,
            `/support/tickets?id=${ticket.id}`
          )
        ));
      }
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

    const supabase = await createServerClient();
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
