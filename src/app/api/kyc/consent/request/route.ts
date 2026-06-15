import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';

/**
 * POST /api/kyc/consent/request
 * Dispatches a tracked POPIA consent link to the client via Email, SMS, or WhatsApp
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contactId, workspaceId, checkTypes, channel } = await req.json();

    if (!contactId || !workspaceId || !checkTypes || !Array.isArray(checkTypes) || !channel) {
      return NextResponse.json({ error: 'Missing required payload parameters' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Create a pending consent record
    const { data: consent, error: insertError } = await adminClient
      .from('kyc_consent')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        check_types: checkTypes,
        status: 'pending',
        reference: `consent_${Date.now()}`
      })
      .select()
      .single();

    if (insertError || !consent) {
      throw new Error('Failed to initialize consent log: ' + insertError?.message);
    }

    // 2. Fetch contact details
    const { data: contact, error: contactError } = await adminClient
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      throw new Error('Contact profile not found');
    }

    // 3. Fetch workspace branding details
    const { data: workspace, error: wsError } = await adminClient
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (wsError || !workspace) {
      throw new Error('Workspace profile not found');
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const consentLink = `${appUrl}/kyc/consent/${consent.id}`;

    // 4. Dispatch link based on specified channel
    if (channel === 'email') {
      if (!contact.email) {
        return NextResponse.json({ error: 'Contact lacks a configured email address' }, { status: 400 });
      }

      const { sendEmail } = await import('@/lib/email');
      await sendEmail({
        to: contact.email,
        subject: `Consent Request for Identity Verification — ${workspace.name}`,
        html: `
          <div style="font-family:sans-serif;padding:30px;color:#333;line-height:1.6;max-width:500px;margin:0 auto;border:1px solid rgba(0,0,0,0.05);border-radius:16px;background-color:#fafafa;">
            <h2 style="color:#8b5cf6;margin-bottom:15px;text-transform:uppercase;font-family:monospace;letter-spacing:1px;font-size:18px;">Consent Request</h2>
            <p>Hello ${contact.first_name},</p>
            <p>In order to perform necessary verifications under FICA and the Protection of Personal Information Act (POPIA), <strong>${workspace.registered_name || workspace.name}</strong> requests your explicit consent to run the following checks:</p>
            <ul style="padding-left:20px;color:#555;font-size:13px;line-height:1.8;">
              ${checkTypes.map((t: string) => `<li><strong>${t.replace(/_/g, ' ').toUpperCase()}</strong></li>`).join('')}
            </ul>
            <p>Please click the button below to view statutory disclosures, data sharing partners, and sign the electronic consent form:</p>
            <div style="margin:30px 0;text-align:center;">
              <a href="${consentLink}" style="background-color:#8b5cf6;color:#fff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:bold;font-size:13px;display:inline-block;text-transform:uppercase;letter-spacing:1px;box-shadow:0 4px 12px rgba(139,92,246,0.25);">Review & Sign Consent</a>
            </div>
            <p style="font-size:11px;color:#666;">This secure link is tracked and will update your contact record directly.</p>
            <p style="font-size:11px;color:#888;">If the button doesn't work, copy and paste this link: <br/><a href="${consentLink}" style="color:#8b5cf6;">${consentLink}</a></p>
          </div>
        `
      });
    } else if (channel === 'sms' || channel === 'whatsapp') {
      if (!contact.phone) {
        return NextResponse.json({ error: 'Contact lacks a configured phone number' }, { status: 400 });
      }

      const { sendSMS } = await import('@/lib/sms');
      const from = workspace.twilio_number
        ? (channel === 'whatsapp' ? `whatsapp:${workspace.twilio_number}` : workspace.twilio_number)
        : undefined;
      
      let to = contact.phone.trim();
      if (channel === 'whatsapp' && !to.startsWith('whatsapp:')) {
        to = `whatsapp:${to}`;
      }

      const message = `Hello ${contact.first_name}, ${workspace.registered_name || workspace.name} requests your POPIA consent to perform verifications. Please view statutory disclosures and sign here: ${consentLink}`;

      await sendSMS({
        to,
        message,
        config: {
          accountSid: workspace.twilio_sid,
          authToken: workspace.twilio_token,
          fromNumber: from
        }
      });
    } else {
      return NextResponse.json({ error: 'Unsupported dispatch channel: ' + channel }, { status: 400 });
    }

    // 5. Insert system activity log
    await adminClient.from('contact_activities').insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      type: 'system',
      description: `Dispatched POPIA consent request via ${channel.toUpperCase()}`
    });

    return NextResponse.json({ success: true, consentId: consent.id });
  } catch (err: any) {
    console.error('[POST /api/kyc/consent/request Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to dispatch consent request' }, { status: 500 });
  }
}
