import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/sms';
import { resolveWorkspaceTwilioCredentials } from '@/lib/twilio/resolveWorkspaceTwilioCredentials';
import { SignJWT } from 'jose';
import crypto from 'crypto';
import { logger } from '@/shared/logger';

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

    // Fetch contacts with active portal access and a phone number who have logged in before.
    // Batch 5 / H2: filters on phone_e164 (the generated, validated E.164 column — migration
    // 20260921000012, backed by src/lib/phone.ts::normalizePhone) instead of the raw `phone`
    // column. A contact whose phone can't be confidently normalized (ambiguous length, no
    // country signal — see normalizePhone's own "never guessed" cases) gets phone_e164 = NULL
    // and is excluded here rather than reached with a guessed number.
    const { data: contacts, error } = await supabaseAdmin
      .from('contacts')
      .select('id, email, first_name, phone_e164, workspace_id, last_login_at, last_reengagement_sent_at')
      .eq('portal_access_enabled', true)
      .eq('portal_access_revoked', false)
      .not('last_login_at', 'is', null)
      .lte('last_login_at', thirtyDaysAgo.toISOString())
      .not('phone_e164', 'is', null);

    if (error) throw error;

    if (!contacts || contacts.length === 0) {
      console.log('[Re-engagement Loop] No inactive contacts matching criteria found.');
      return { processed: 0, sent: 0, skipped: 0 };
    }

    let sentCount = 0;
    let skippedCount = 0;

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
        .select('twilio_sid, twilio_token, twilio_sid_encrypted, twilio_token_encrypted, twilio_number, name')
        .eq('id', contact.workspace_id)
        .single();

      const workspaceName = workspace?.name || 'our client portal';

      // Batch 5 / H2: contact.phone_e164 is already a validated E.164 destination (the query
      // above excludes contacts it couldn't be resolved for) — no more inline country-code
      // guessing here.
      const whatsappTo = `whatsapp:${contact.phone_e164}`;
      const message = `Hi ${contact.first_name || 'there'}! We noticed it's been a while since you last logged into the ${workspaceName} portal. Here's a secure, direct link to access your dashboard, courses, and bills: ${magicLinkUrl}`;

      // Batch 5 / H2: a real, workspace-owned or platform-level (TWILIO_PHONE_NUMBER) number
      // only — the previous '+14155238886' fallback was Twilio's PUBLIC WhatsApp sandbox
      // number, which real, unconsented recipients must never be contacted from. No FROM
      // number resolves -> skip this send and log it, rather than reroute to the sandbox.
      const fromNumber = workspace?.twilio_number || process.env.TWILIO_PHONE_NUMBER || null;
      if (!fromNumber) {
        logger.warn(
          { contactId: contact.id, workspaceId: contact.workspace_id },
          'cron.reengagement_loop.no_from_number_configured_skipping'
        );
        skippedCount++;
        continue;
      }

      try {
        const creds = resolveWorkspaceTwilioCredentials(workspace);
        await sendSMS({
          to: whatsappTo,
          message,
          workspaceId: contact.workspace_id,
          config: {
            ...creds,
            fromNumber: `whatsapp:${fromNumber}`,
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

    return { processed: contacts.length, sent: sentCount, skipped: skippedCount };
  } catch (err: any) {
    console.error('[Re-engagement Loop Error]:', err);
    throw err;
  }
}
