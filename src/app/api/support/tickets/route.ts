import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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
    const { data: { session } } = await supabase.auth.getSession();
    const clientDb = session?.user ? supabase : supabaseAdmin;

    // Try to find a contact by email in this workspace
    let contactId = null;
    const { data: contacts } = await clientDb
      .from('contacts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('email', email)
      .limit(1);

    if (contacts && contacts.length > 0) {
      contactId = contacts[0].id;
    } else {
      // Create contact if not found
      const { data: newContact, error: contactError } = await clientDb
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

    // Map and normalize priority values to lowercase ENUM ('low', 'normal', 'high', 'urgent')
    const allowedPriorities = ['low', 'normal', 'high', 'urgent'];
    let mappedPriority = 'normal';
    if (priority) {
      const p = priority.toLowerCase().trim();
      if (p === 'critical' || p === 'urgent') mappedPriority = 'urgent';
      else if (p === 'high') mappedPriority = 'high';
      else if (p === 'medium' || p === 'normal') mappedPriority = 'normal';
      else if (p === 'low') mappedPriority = 'low';
    }

    // Insert Ticket
    const { data: ticket, error: ticketError } = await clientDb
      .from('support_tickets')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        title: subject,
        description: description,
        priority: mappedPriority,
        status: 'open'
      })
      .select()
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: ticketError?.message || 'Failed to create ticket' }, { status: 500 });
    }

    // Insert Initial Message
    const { error: msgError } = await clientDb
      .from('support_ticket_messages')
      .insert({
        ticket_id: ticket.id,
        workspace_id: workspaceId,
        contact_id: contactId,
        sender_type: 'customer',
        message: description
      });

    if (msgError) console.error('Failed to insert initial ticket message:', msgError);

    // Send notifications (emails and WhatsApp alerts)
    try {
      await resend.emails.send({
        from: 'Support Desk <support@leadsmind.io>',
        to: email,
        replyTo: `ticket+${ticket.id}@support.leadsmind.io`,
        subject: `Ticket Received: ${subject}`,
        headers: {
          'Message-ID': `<ticket-${ticket.id}@support.leadsmind.io>`
        },
        html: `<p>Hi ${name || 'there'},</p><p>We have received your support request regarding "<strong>${subject}</strong>".</p><p>You can view your ticket thread and updates online: <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/support/public-thread?id=${ticket.id}">View Ticket Thread</a></p><p>Best,<br/>The Support Team</p>`
      });

      // Notify Workspace Admins and Owner (and Assigned Agent if any)
      const { getWorkspaceNotificationRecipients, createInAppNotification } = await import('@/lib/support-helper');
      const { emails: recipients, phones, uids } = await getWorkspaceNotificationRecipients(workspaceId, ticket.assigned_to);
      
      if (recipients.length > 0) {
        await resend.emails.send({
          from: 'Support Desk <support@leadsmind.io>',
          to: recipients,
          subject: `[New Ticket] ${subject}`,
          html: `<p>A new support ticket has been created in your workspace.</p><p><strong>From:</strong> ${email}</p><p><strong>Subject:</strong> ${subject}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/support/tickets?id=${ticket.id}">View Ticket Thread</a></p>`
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

      // Send WhatsApp notifications via Twilio API
      if (phones && phones.length > 0) {
        const { data: workspace } = await supabaseAdmin
          .from('workspaces')
          .select('name, twilio_number, twilio_sid, twilio_token')
          .eq('id', workspaceId)
          .single();

        const fromNumber = `whatsapp:${workspace?.twilio_number || process.env.TWILIO_PHONE_NUMBER}`;
        const configTwilio = {
          accountSid: workspace?.twilio_sid,
          authToken: workspace?.twilio_token,
          fromNumber
        };

        const { sendSMS } = await import('@/lib/sms');
        for (const phone of phones) {
          try {
            const cleanPhone = phone.startsWith('+') ? phone : `+${phone}`;
            const to = `whatsapp:${cleanPhone}`;
            const wsName = workspace?.name || 'LeadsMind';
            const messageText = `🔔 *New Support Ticket logged for ${wsName}*\n\n*From:* ${name || email}\n*Subject:* ${subject}\n*Priority:* ${mappedPriority.toUpperCase()}\n\nReply directly from your dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/support/tickets?id=${ticket.id}`;
            await sendSMS({
              to,
              message: messageText,
              config: configTwilio
            });
          } catch (whatsappErr) {
            console.error('Failed to dispatch WhatsApp notification to', phone, whatsappErr);
          }
        }
      }
    } catch (e) {
      console.error('Failed to send notifications:', e);
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
