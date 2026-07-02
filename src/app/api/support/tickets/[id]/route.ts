import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) throw new ForbiddenError('No active workspace');
    
    const supabaseAdmin = (await import('@supabase/supabase-js')).createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const [ticketRes, messagesRes, attachmentsRes] = await Promise.all([
      supabase.from('support_tickets').select('*, contact:contacts(*)').eq("id", params.id).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId).single(),
      supabase.from('support_ticket_messages').select('*').eq('ticket_id', params.id).order('created_at', { ascending: true }),
      supabase.from('ticket_attachments').select('*').eq('ticket_id', params.id)
    ]);

    if (ticketRes.error) throw ticketRes.error;

    const attachments = attachmentsRes.data || [];
    const attachmentsWithUrls = await Promise.all(attachments.map(async (att: any) => {
      try {
        const { data } = await supabaseAdmin.storage
          .from('support-ticket-files')
          .createSignedUrl(att.storage_path, 60 * 60);
        return {
          ...att,
          url: data?.signedUrl || null
        };
      } catch (err) {
        console.error('Failed to generate signed url:', err);
        return { ...att, url: null };
      }
    }));

    return NextResponse.json({ 
      ticket: ticketRes.data,
      messages: messagesRes.data || [],
      attachments: attachmentsWithUrls
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { status, assigned_to, priority } = body;
    
    const supabase = await createServerClient();
    
    const updates: any = {};
    if (status) updates.status = status;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    if (priority) updates.priority = priority;

    const { data, error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq("id", params.id).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId)
      .select('*, contact:contacts(*)')
      .single();

    if (error) throw error;

    // Send notifications
    try {
      const { Resend } = await import('resend');
      const { createClient } = await import('@supabase/supabase-js');
      
      const resend = new Resend(process.env.RESEND_API_KEY);
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // 1. Notify Assigned Agent
      const agentId = data.assigned_to;
      let agentEmail = null;
      if (agentId) {
        const { data: u } = await supabaseAdmin
          .from('users')
          .select('email')
          .eq("id", agentId).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId)
          .single();
        if (u) agentEmail = u.email;

        // In-app notification
        const { createInAppNotification } = await import('@/lib/support-helper');
        await createInAppNotification(
          agentId,
          `Ticket Updated: ${data.title}`,
          `Status: ${data.status} | Priority: ${data.priority}`,
          `/support/tickets?id=${data.id}`
        );
      }

      if (agentEmail) {
        await resend.emails.send({
          from: 'Support Desk <support@leadsmind.io>',
          to: agentEmail,
          subject: `[Ticket Updated] #${data.id.substring(0, 8)}: ${data.title}`,
          html: `<p>Ticket <strong>"${data.title}"</strong> has been updated.</p><p><strong>Status:</strong> ${data.status}</p><p><strong>Priority:</strong> ${data.priority}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/support/tickets?id=${data.id}">View Ticket Thread</a></p>`
        });
      }

      // 2. Notify Ticket Owner (Customer)
      const customerEmail = data.contact?.email;
      if (customerEmail) {
        await resend.emails.send({
          from: 'Support Desk <support@leadsmind.io>',
          to: customerEmail,
          replyTo: `ticket+${data.id}@support.leadsmind.io`,
          subject: `Ticket Update: ${data.title}`,
          html: `<p>Hi ${data.contact?.first_name || 'there'},</p><p>Your support ticket has been updated.</p><p><strong>Status:</strong> ${data.status}</p><p>Our team will continue to keep you updated.</p><p>Best,<br/>The Support Team</p>`
        });
      }
    } catch (err) {
      console.error('Failed to send update notifications:', err);
    }
    
    return NextResponse.json({ success: true, ticket: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
