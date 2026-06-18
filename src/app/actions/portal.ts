'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { sendEmail } from '@/lib/email';
import { SignJWT } from 'jose';
import crypto from 'crypto';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_key_leadsmind_jwt_passwordless_token'
);

export async function inviteContactToPortal(contactId: string) {
  const supabase = await createServerClient();
  const adminClient = createAdminClient();

  // Get current user session to authorize action
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized: No session user found.' };
  }

  // 1. Fetch contact details using adminClient to bypass RLS constraints
  const { data: contact, error: fetchErr } = await adminClient
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  if (fetchErr) {
    console.error('[inviteContactToPortal] fetch error:', fetchErr);
    return { success: false, error: `Contact fetch query error: ${fetchErr.message} (Code: ${fetchErr.code})` };
  }
  if (!contact) {
    return { success: false, error: 'Contact not found in database (null record).' };
  }

  if (!contact.email) {
    return { success: false, error: 'Contact does not have an email address.' };
  }

  // 1b. Fetch workspace details in a separate query to bypass PostgREST join constraints (PGRST200)
  const { data: workspace, error: wsErr } = await adminClient
    .from('workspaces')
    .select('*')
    .eq('id', contact.workspace_id)
    .single();

  if (wsErr) {
    console.error('[inviteContactToPortal] workspace fetch error:', wsErr);
  }

  // Verify that the authenticated user is a member of this contact's workspace
  const { data: membership, error: memberErr } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', contact.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (memberErr) {
    console.error('[inviteContactToPortal] membership check error:', memberErr);
    return { success: false, error: `Workspace membership query error: ${memberErr.message}` };
  }
  if (!membership) {
    return { success: false, error: `Permission denied: User ${user.email} is not a member of contact's workspace (${contact.workspace_id}).` };
  }

  const plan = workspace?.plan_tier || workspace?.plan || 'free';
  const isWhiteLabeled = plan !== 'free';
  const portalName = (isWhiteLabeled && workspace?.name) ? workspace.name : 'LeadsMind';

  // 2. Set portal access fields in database
  const { error: updateErr } = await adminClient
    .from('contacts')
    .update({
      portal_access_enabled: true,
      portal_access_revoked: false,
      portal_invited_at: new Date().toISOString()
    })
    .eq('id', contactId);

  if (updateErr) {
    return { success: false, error: 'Failed to enable portal access: ' + updateErr.message };
  }

  // 3. Generate token for magic link
  const token = await new SignJWT({ email: contact.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret);

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Store magic link
  await adminClient.from('student_magic_links').insert({
    email: contact.email,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  });

  // 4. Send email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const magicLinkUrl = `${appUrl}/portal/auth/verify?token=${token}`;

  try {
    await sendEmail({
      to: contact.email,
      subject: `Welcome to the ${portalName} Client Portal`,
      html: `
        <div style="font-family:sans-serif;padding:30px;color:#333;line-height:1.6;max-width:500px;margin:0 auto;border:1px solid rgba(0,0,0,0.05);border-radius:16px;background-color:#fafafa;">
          <h2 style="color:#2563eb;margin-bottom:15px;text-transform:uppercase;font-family:monospace;letter-spacing:1px;">Client Portal Access</h2>
          <p>Hello ${contact.first_name},</p>
          <p>You have been invited to the ${portalName} Client Portal. Click the button below to access your dashboard, invoices, projects, and bookings:</p>
          <div style="margin:30px 0;text-align:center;">
            <a href="${magicLinkUrl}" style="background-color:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:bold;font-size:13px;display:inline-block;text-transform:uppercase;letter-spacing:1px;box-shadow:0 4px 12px rgba(37,99,235,0.15);">Access Client Portal</a>
          </div>
          <p style="font-size:11px;color:#666;">This secure link is valid for <strong>15 minutes</strong> and will be invalidated after first use.</p>
          <p style="font-size:11px;color:#888;">If the button doesn't work, copy and paste this link: <br/><a href="${magicLinkUrl}" style="color:#2563eb;">${magicLinkUrl}</a></p>
        </div>
      `
    });
  } catch (err: any) {
    console.error('Failed to send portal invitation email:', err.message);
  }

  // 5. Log activity
  await adminClient.from('contact_activities').insert({
    workspace_id: contact.workspace_id,
    contact_id: contactId,
    type: 'system',
    description: 'Invited to client portal'
  });

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function revokeContactPortalAccess(contactId: string) {
  const supabase = await createServerClient();
  const adminClient = createAdminClient();

  // Get current user session to authorize action
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized: No session user found.' };
  }

  // 1. Fetch contact details using adminClient
  const { data: contact, error: fetchErr } = await adminClient
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  if (fetchErr) {
    console.error('[revokeContactPortalAccess] fetch error:', fetchErr);
    return { success: false, error: `Contact fetch query error: ${fetchErr.message}` };
  }
  if (!contact) {
    return { success: false, error: 'Contact not found (null record).' };
  }

  // Verify that the authenticated user is a member of this contact's workspace
  const { data: membership, error: memberErr } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', contact.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (memberErr) {
    console.error('[revokeContactPortalAccess] membership check error:', memberErr);
    return { success: false, error: `Workspace membership query error: ${memberErr.message}` };
  }
  if (!membership) {
    return { success: false, error: `Permission denied: User ${user.email} is not a member of contact's workspace (${contact.workspace_id}).` };
  }

  const { error: updateErr } = await adminClient
    .from('contacts')
    .update({
      portal_access_revoked: true,
      portal_revoked_at: new Date().toISOString()
    })
    .eq('id', contactId);

  if (updateErr) {
    return { success: false, error: 'Failed to revoke portal access: ' + updateErr.message };
  }

  // Log activity
  await adminClient.from('contact_activities').insert({
    workspace_id: contact.workspace_id,
    contact_id: contactId,
    type: 'system',
    description: 'Client portal access revoked'
  });

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function impersonateContact(contactId: string, reason: string = 'Admin request') {
  const supabase = await createServerClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized: No session user found.' };

  // Fetch contact
  const { data: contact, error: fetchErr } = await adminClient
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  if (fetchErr) {
    console.error('[impersonateContact] fetch error:', fetchErr);
    return { success: false, error: `Contact fetch query error: ${fetchErr.message}` };
  }
  if (!contact) {
    return { success: false, error: 'Contact not found (null record).' };
  }

  // Verify that current user is an admin of the workspace
  const { data: membership, error: memberErr } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', contact.workspace_id)
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (memberErr) {
    console.error('[impersonateContact] membership check error:', memberErr);
    return { success: false, error: `Workspace membership query error: ${memberErr.message}` };
  }
  if (!membership) {
    return { success: false, error: 'Permission denied: Requires admin access' };
  }

  // Log impersonation
  await adminClient.from('admin_impersonation_logs').insert({
    workspace_id: contact.workspace_id,
    admin_id: user.id,
    contact_id: contactId,
    reason
  });

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set('impersonate_contact_id', contactId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 // 1 hour
  });

  return { success: true };
}

export async function exitImpersonation() {
  const cookieStore = await cookies();
  cookieStore.delete('impersonate_contact_id');
  return { success: true };
}

export async function createPortalSupportTicket(values: { title: string; description: string; priority: string; category?: string }) {
  const { getPortalSession } = await import('@/lib/portal/session');
  const session = await getPortalSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const adminClient = createAdminClient();
  const { searchHelpArticles } = await import('@/app/actions/help');

  let isAutoResolved = false;
  let autoReply = '';

  // Perform semantic search check
  const searchRes = await searchHelpArticles(values.description);
  const topMatch = searchRes.data && searchRes.data[0];

  const status = (topMatch && topMatch.similarity >= 0.85) ? 'resolved' : 'open';

  const { data: ticket, error } = await adminClient
    .from('support_tickets')
    .insert({
      workspace_id: session.workspace.id,
      contact_id: session.contact.id,
      title: values.title,
      description: values.description,
      priority: values.priority || 'normal',
      category: values.category || 'General',
      status
    })
    .select('id')
    .single();

  if (error || !ticket) {
    return { success: false, error: error?.message || 'Failed to create support ticket' };
  }

  if (status === 'resolved' && topMatch) {
    isAutoResolved = true;
    autoReply = `LENA AI Auto-Response:\n\nBased on your query, we found an article that might resolve your issue:\n\n**${topMatch.title}**\n${topMatch.body_plain.substring(0, 300)}...\n\nSince this matches our knowledge base guidelines, this ticket has been marked as resolved. If this did not resolve your issue, please reply to this message to re-open the ticket.`;

    await adminClient.from('support_ticket_messages').insert({
      ticket_id: ticket.id,
      workspace_id: session.workspace.id,
      sender_type: 'system',
      message: autoReply,
      is_internal_note: false
    });

    await adminClient.from('contact_activities').insert({
      workspace_id: session.workspace.id,
      contact_id: session.contact.id,
      type: 'system',
      description: `Support ticket auto-resolved by LENA: ${values.title}`
    });
  } else {
    // Log activity
    await adminClient.from('contact_activities').insert({
      workspace_id: session.workspace.id,
      contact_id: session.contact.id,
      type: 'system',
      description: `Support ticket created: ${values.title} (Category: ${values.category || 'General'})`
    });
  }

  revalidatePath('/portal/support');
  return { success: true, autoResolved: isAutoResolved, replyMessage: autoReply };
}

export async function replyToSupportTicket(ticketId: string, message: string, attachments?: { name: string; size: number; mimeType: string; path: string }[]) {
  const { getPortalSession } = await import('@/lib/portal/session');
  const session = await getPortalSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const adminClient = createAdminClient();

  // 1. Verify ticket ownership
  const { data: ticket, error: ticketErr } = await adminClient
    .from('support_tickets')
    .select('id, contact_id')
    .eq('id', ticketId)
    .single();

  if (ticketErr || !ticket || ticket.contact_id !== session.contact.id) {
    return { success: false, error: 'Ticket not found or access denied.' };
  }

  // 2. Insert message
  const { data: msg, error: msgErr } = await adminClient
    .from('support_ticket_messages')
    .insert({
      ticket_id: ticketId,
      workspace_id: session.workspace.id,
      contact_id: session.contact.id,
      sender_type: 'customer',
      message: message,
      is_internal_note: false
    })
    .select()
    .single();

  if (msgErr || !msg) {
    return { success: false, error: 'Failed to save message: ' + msgErr?.message };
  }

  // 3. Register attachments if provided
  if (attachments && attachments.length > 0) {
    for (const file of attachments) {
      await adminClient.from('ticket_attachments').insert({
        ticket_id: ticketId,
        message_id: msg.id,
        workspace_id: session.workspace.id,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.mimeType,
        storage_path: file.path
      });
    }
  }

  // 4. Reset ticket status to open if it was waiting_client
  await adminClient
    .from('support_tickets')
    .update({ status: 'open', updated_at: new Date().toISOString() })
    .eq('id', ticketId)
    .eq('status', 'waiting_client');

  revalidatePath('/portal/support');
  return { success: true };
}

export async function submitCSATRating(ticketId: string, rating: number, comment?: string) {
  const { getPortalSession } = await import('@/lib/portal/session');
  const session = await getPortalSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const adminClient = createAdminClient();

  // Verify ticket ownership
  const { data: ticket, error: ticketErr } = await adminClient
    .from('support_tickets')
    .select('id, contact_id')
    .eq('id', ticketId)
    .single();

  if (ticketErr || !ticket || ticket.contact_id !== session.contact.id) {
    return { success: false, error: 'Ticket not found or access denied.' };
  }

  const { error } = await adminClient
    .from('support_tickets')
    .update({
      csat_rating: rating,
      csat_feedback: comment || null
    })
    .eq('id', ticketId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log activity
  await adminClient.from('contact_activities').insert({
    workspace_id: session.workspace.id,
    contact_id: session.contact.id,
    type: 'system',
    description: `Submitted CSAT Rating: ${rating}/5 Stars for support ticket`
  });

  revalidatePath('/portal/support');
  return { success: true };
}

export async function updatePortalProfile(values: { 
  firstName: string; 
  lastName: string; 
  phone: string;
  company?: string;
  language?: string;
  notificationPreferences?: Record<string, boolean>;
}) {
  const { getPortalSession } = await import('@/lib/portal/session');
  const session = await getPortalSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const adminClient = createAdminClient();
  const updatePayload: Record<string, any> = {
    first_name: values.firstName,
    last_name: values.lastName,
    phone: values.phone
  };

  if (values.company !== undefined) {
    updatePayload.company = values.company;
  }

  if (values.language) {
    updatePayload.language = values.language;
  }

  if (values.notificationPreferences) {
    updatePayload.notification_preferences = values.notificationPreferences;
  }

  const { error } = await adminClient
    .from('contacts')
    .update(updatePayload)
    .eq('id', session.contact.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/portal/profile');
  return { success: true };
}

export async function updatePortalPassword(password: string) {
  const { getPortalSession } = await import('@/lib/portal/session');
  const session = await getPortalSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const bcrypt = require('bcryptjs');
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('contacts')
    .update({
      portal_password_hash: passwordHash
    })
    .eq('id', session.contact.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log activity
  await adminClient.from('contact_activities').insert({
    workspace_id: session.workspace.id,
    contact_id: session.contact.id,
    type: 'system',
    description: 'Updated portal security password'
  });

  revalidatePath('/portal/profile');
  return { success: true };
}

export async function requestEmailChange(newEmail: string) {
  const { getPortalSession } = await import('@/lib/portal/session');
  const session = await getPortalSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const cleanEmail = newEmail.toLowerCase().trim();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Invalid email address.' };
  }

  const adminClient = createAdminClient();

  // Generate cryptographically secure token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Insert token request valid for 1 hour
  const { error: insertErr } = await adminClient
    .from('email_change_requests')
    .insert({
      contact_id: session.contact.id,
      new_email: cleanEmail,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    });

  if (insertErr) {
    return { success: false, error: 'Failed to initialize request.' };
  }

  // Dispatch email to new address
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verifyUrl = `${appUrl}/portal/profile/verify-email?token=${token}`;
  
  const workspace = session.workspace || {};
  const isWhiteLabeled = workspace.plan_tier !== 'free';
  const portalName = isWhiteLabeled ? workspace.name : 'LeadsMind';

  try {
    await sendEmail({
      to: cleanEmail,
      subject: `Confirm ${portalName} Profile Email Update`,
      html: `
        <div style="font-family:sans-serif;padding:30px;color:#333;line-height:1.6;max-width:500px;margin:0 auto;border:1px solid rgba(0,0,0,0.05);border-radius:16px;background-color:#fafafa;">
          <h2 style="color:#2563eb;margin-bottom:15px;text-transform:uppercase;font-family:monospace;letter-spacing:1px;">Confirm Email Update</h2>
          <p>Hello ${session.contact.first_name},</p>
          <p>You requested to update your email address. Click the button below to confirm and verify this change:</p>
          <div style="margin:30px 0;text-align:center;">
            <a href="${verifyUrl}" style="background-color:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:bold;font-size:13px;display:inline-block;text-transform:uppercase;letter-spacing:1px;box-shadow:0 4px 12px rgba(37,99,235,0.15);">Verify Email Address</a>
          </div>
          <p style="font-size:11px;color:#666;">This secure confirmation link is active for <strong>1 hour</strong>.</p>
        </div>
      `
    });
  } catch (err: any) {
    return { success: false, error: 'Failed to deliver verification email: ' + err.message };
  }

  return { success: true };
}

export async function verifyEmailChange(token: string) {
  const adminClient = createAdminClient();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Query validation request
  const { data: request, error: reqErr } = await adminClient
    .from('email_change_requests')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('used', false)
    .maybeSingle();

  if (reqErr || !request) {
    return { success: false, error: 'Invalid or already used verification token.' };
  }

  if (new Date() > new Date(request.expires_at)) {
    return { success: false, error: 'Verification token has expired.' };
  }

  // Update request to used
  await adminClient
    .from('email_change_requests')
    .update({ used: true })
    .eq('id', request.id);

  // Update contact email address
  const { error: updateErr } = await adminClient
    .from('contacts')
    .update({ email: request.new_email })
    .eq('id', request.contact_id);

  if (updateErr) {
    return { success: false, error: 'Failed to update email address: ' + updateErr.message };
  }

  // Log activity
  await adminClient.from('contact_activities').insert({
    contact_id: request.contact_id,
    type: 'system',
    description: `Email updated successfully to: ${request.new_email}`
  });

  return { success: true };
}

export async function acceptPopiaConsent(ipAddress: string) {
  const { getPortalSession } = await import('@/lib/portal/session');
  const session = await getPortalSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('contacts')
    .update({
      consent_timestamp: new Date().toISOString(),
      consent_ip: ipAddress,
      processing_purpose_scope: 'portal_access'
    })
    .eq('id', session.contact.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log activity
  await adminClient.from('contact_activities').insert({
    workspace_id: session.workspace.id,
    contact_id: session.contact.id,
    type: 'system',
    description: 'Accepted POPIA privacy policy agreements via client portal'
  });

  revalidatePath('/portal/dashboard');
  return { success: true };
}

export async function requestCopyOfData() {
  const { getPortalSession } = await import('@/lib/portal/session');
  const session = await getPortalSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const adminClient = createAdminClient();

  // 1. Gather all customer data across schemas
  const [invoices, appointments, tickets, courses] = await Promise.all([
    adminClient.from('invoices').select('*').eq('contact_id', session.contact.id),
    adminClient.from('appointments').select('*').eq('contact_id', session.contact.id),
    adminClient.from('support_tickets').select('*').eq('contact_id', session.contact.id),
    adminClient.from('enrollments').select('*, course:courses(*)').eq('contact_id', session.contact.id)
  ]);

  // 2. Format detailed POPIA subject access report
  const workspace = session.workspace || {};
  const isWhiteLabeled = workspace.plan_tier !== 'free';
  const portalName = isWhiteLabeled ? workspace.name : 'LeadsMind';

  const report = `
    <html>
      <body style="font-family:sans-serif;padding:30px;color:#333;line-height:1.6;">
        <h2 style="color:#2563eb;border-bottom:1px solid #ddd;padding-bottom:10px;">POPIA Subject Access Report (SAR)</h2>
        <p>This report contains a copy of all personal information held by ${portalName} for your account as of ${new Date().toLocaleDateString()}.</p>
        
        <h3>1. Personal Details</h3>
        <ul>
          <li><strong>ID:</strong> ${session.contact.id}</li>
          <li><strong>Full Name:</strong> ${session.contact.first_name} ${session.contact.last_name || ''}</li>
          <li><strong>Email:</strong> ${session.contact.email}</li>
          <li><strong>Phone:</strong> ${session.contact.phone || 'N/A'}</li>
          <li><strong>Consent Registered:</strong> ${session.contact.consent_timestamp ? new Date(session.contact.consent_timestamp).toLocaleString() : 'N/A'}</li>
          <li><strong>Consent IP:</strong> ${session.contact.consent_ip || 'N/A'}</li>
        </ul>

        <h3>2. Financial Invoices Ledger</h3>
        <table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;text-align:left;">
          <tr style="background:#eee;">
            <th>Invoice Number</th><th>Due Date</th><th>Total</th><th>Status</th>
          </tr>
          ${(invoices.data || []).map(inv => `
            <tr>
              <td>${inv.invoice_number}</td><td>${inv.due_date}</td><td>R ${inv.total_amount}</td><td>${inv.status}</td>
            </tr>
          `).join('')}
        </table>

        <h3>3. Scheduled Appointments</h3>
        <ul>
          ${(appointments.data || []).map(apt => `
            <li><strong>${apt.title}</strong>: ${new Date(apt.start_time).toLocaleString()} (${apt.status})</li>
          `).join('') || '<li>No appointments found</li>'}
        </ul>

        <h3>4. Support Tickets Desk</h3>
        <ul>
          ${(tickets.data || []).map(t => `
            <li>[#${t.id.substring(0,8)}] <strong>${t.title}</strong> - Status: ${t.status} (Priority: ${t.priority})</li>
          `).join('') || '<li>No support tickets found</li>'}
        </ul>

        <h3>5. LMS Course Enrollments</h3>
        <ul>
          ${(courses.data || []).map(c => `
            <li><strong>${c.course?.title || 'Unknown Course'}</strong>: Progress ${c.status || 'Active'}</li>
          `).join('') || '<li>No enrollments found</li>'}
        </ul>

        <p style="margin-top:30px;font-size:11px;color:#777;border-top:1px solid #eee;padding-top:10px;">
          Generated automatically under POPIA regulatory directives. For any questions, open a Tech support ticket.
        </p>
      </body>
    </html>
  `;

  // 3. Email report
  try {
    await sendEmail({
      to: session.contact.email,
      subject: `Your ${portalName} POPIA Subject Access Report (SAR) Data Copy`,
      html: report
    });
  } catch (err: any) {
    return { success: false, error: 'Email delivery failed: ' + err.message };
  }

  // 4. Log activity
  await adminClient.from('contact_activities').insert({
    workspace_id: session.workspace.id,
    contact_id: session.contact.id,
    type: 'system',
    description: 'Requested copy of personal data (POPIA SAR)'
  });

  return { success: true };
}

export async function requestAccountDeletion() {
  const { getPortalSession } = await import('@/lib/portal/session');
  const session = await getPortalSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const adminClient = createAdminClient();

  // 1. Mark contact record as deletion requested
  const { error: updateErr } = await adminClient
    .from('contacts')
    .update({
      deletion_requested: true,
      deletion_requested_at: new Date().toISOString()
    })
    .eq('id', session.contact.id);

  if (updateErr) {
    return { success: false, error: 'Failed to record deletion state.' };
  }

  // 2. Automate a support ticket to trigger internal operator workflows to anonymize details
  await adminClient
    .from('support_tickets')
    .insert({
      workspace_id: session.workspace.id,
      contact_id: session.contact.id,
      title: `POPIA Account Deletion Request - Contact ID: ${session.contact.id.substring(0, 8).toUpperCase()}`,
      description: `Client ${session.contact.email} has requested permanent deletion / right to erasure under POPIA rules. Operators must anonymize personal identifiers (first/last names, phone, email details) within 30 days, while preserving necessary billing transaction history to satisfy SARS auditing rules.`,
      priority: 'high',
      category: 'Tech',
      status: 'open'
    });

  // 3. Log activity
  await adminClient.from('contact_activities').insert({
    workspace_id: session.workspace.id,
    contact_id: session.contact.id,
    type: 'system',
    description: 'Requested account deletion / POPIA right to erasure'
  });

  return { success: true };
}

export async function captureInvoiceView(invoiceId: string) {
  const { getPortalSession } = await import('@/lib/portal/session');
  const session = await getPortalSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const supabase = await createServerClient();
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('id, workspace_id, contact_id, invoice_number')
    .eq('id', invoiceId)
    .single();

  if (error || !invoice) {
    return { success: false, error: 'Invoice not found' };
  }

  if (invoice.contact_id !== session.contact.id) {
    return { success: false, error: 'Access denied' };
  }

  const adminClient = createAdminClient();
  await adminClient.from('contact_activities').insert({
    workspace_id: session.workspace.id,
    contact_id: session.contact.id,
    type: 'system',
    description: `Viewed invoice: ${invoice.invoice_number}`
  });

  const { triggerWorkflows } = await import('@/lib/automation/executor');
  await triggerWorkflows(session.workspace.id, 'invoice.viewed', session.contact.id);

  return { success: true };
}


