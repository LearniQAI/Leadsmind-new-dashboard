import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/sms';
import { SignJWT } from 'jose';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_key_leadsmind_jwt_passwordless_token'
);

/**
 * Scans for contacts who have not logged in for 30+ days and dispatches a re-engagement WhatsApp magic link.
 */
export async function runReengagementLoop() {
  console.log('[Re-engagement Loop] Running background check...');
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch contacts with active portal access and a phone number who have logged in before
    const { data: contacts, error } = await supabaseAdmin
      .from('contacts')
      .select('id, email, first_name, phone, workspace_id, last_login_at, last_reengagement_sent_at')
      .eq('portal_access_enabled', true)
      .eq('portal_access_revoked', false)
      .not('last_login_at', 'is', null)
      .lte('last_login_at', thirtyDaysAgo.toISOString())
      .not('phone', 'is', null);

    if (error) throw error;

    if (!contacts || contacts.length === 0) {
      console.log('[Re-engagement Loop] No inactive contacts matching criteria found.');
      return { processed: 0, sent: 0 };
    }

    let sentCount = 0;

    for (const contact of contacts) {
      // Rate limit re-engagement messages to once every 30 days
      if (contact.last_reengagement_sent_at) {
        const lastSent = new Date(contact.last_reengagement_sent_at);
        if (lastSent > thirtyDaysAgo) {
          continue; // Skip: already sent re-engagement in the last 30 days
        }
      }

      // Generate 24-hour magic login token
      const token = await new SignJWT({ email: contact.email })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Insert token to allow passwordless verification
      await supabaseAdmin.from('student_magic_links').insert({
        email: contact.email,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const magicLinkUrl = `${appUrl}/portal/auth/verify?token=${token}`;

      // Get workspace details to brand the message
      const { data: workspace } = await supabaseAdmin
        .from('workspaces')
        .select('twilio_sid, twilio_token, twilio_number, name')
        .eq('id', contact.workspace_id)
        .single();

      const workspaceName = workspace?.name || 'our client portal';
      
      const cleanPhone = contact.phone.replace(/[\s\-()]/g, '');
      const formattedPhone = cleanPhone.startsWith('+') 
        ? cleanPhone 
        : `+27${cleanPhone.replace(/^0/, '')}`; // default to South African code if no sign
      
      const whatsappTo = `whatsapp:${formattedPhone}`;
      const message = `Hi ${contact.first_name || 'there'}! We noticed it's been a while since you last logged into the ${workspaceName} portal. Here's a secure, direct link to access your dashboard, courses, and bills: ${magicLinkUrl}`;

      try {
        await sendSMS({
          to: whatsappTo,
          message,
          config: {
            accountSid: workspace?.twilio_sid,
            authToken: workspace?.twilio_token,
            fromNumber: `whatsapp:${workspace?.twilio_number || process.env.TWILIO_PHONE_NUMBER || '+14155238886'}`,
          }
        });

        // Track when this invitation was sent to avoid spamming
        await supabaseAdmin
          .from('contacts')
          .update({
            last_reengagement_sent_at: now.toISOString()
          })
          .eq('id', contact.id);

        // Record activity log
        await supabaseAdmin.from('contact_activities').insert({
          workspace_id: contact.workspace_id,
          contact_id: contact.id,
          type: 'system',
          description: 'Sent WhatsApp magic login link re-engagement invite'
        });

        sentCount++;
      } catch (err) {
        console.error(`[Re-engagement Loop] Failed to send message to ${contact.id}:`, err);
      }
    }

    return { processed: contacts.length, sent: sentCount };
  } catch (err: any) {
    console.error('[Re-engagement Loop Error]:', err);
    throw err;
  }
}
