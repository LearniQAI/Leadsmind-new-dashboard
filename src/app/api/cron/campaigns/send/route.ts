import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { SpamValidator } from '@/lib/intelligence/SpamValidator';
import { PredictiveIntelligence } from '@/lib/intelligence/PredictiveIntelligence';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && key !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized: Invalid cron access key.' }, { status: 401 });
    }

    const now = new Date();
    const nowStr = now.toISOString();

    // 1. Fetch campaigns that are scheduled and ready to send, or currently in progress ("sending")
    const { data: campaigns, error: fetchErr } = await supabaseAdmin
      .from('email_campaigns')
      .select('*')
      .or(`status.eq.sending,and(status.eq.scheduled,scheduled_at.lte.${nowStr})`);

    if (fetchErr) {
      throw fetchErr;
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'No campaigns to process.' });
    }

    let processedCount = 0;

    for (const campaign of campaigns) {
      // 1.5 Run Spam Validator Gate
      const spamResult = SpamValidator.validateEmailContent(campaign.subject || '', campaign.body_html || '');
      if (!spamResult.passed) {
        console.warn(`[Campaign Cron] Campaign ${campaign.id} blocked by Spam Validator. Score: ${spamResult.score}. Triggers: ${spamResult.triggers.join(', ')}`);
        await supabaseAdmin
          .from('email_campaigns')
          .update({ 
            status: 'cancelled',
            sent_at: now.toISOString()
          })
          .eq('id', campaign.id);
        processedCount++;
        continue;
      }

      // 2. Mark status as "sending" to prevent double-processing
      if (campaign.status !== 'sending') {
        await supabaseAdmin
          .from('email_campaigns')
          .update({ status: 'sending' })
          .eq('id', campaign.id);
      }

      // 3. Fetch workspace settings (Resend API key and default sending details)
      const { data: workspace } = await supabaseAdmin
        .from('workspaces')
        .select('resend_api_key, email_from_address')
        .eq('id', campaign.workspace_id)
        .single();

      const apiKey = workspace?.resend_api_key || process.env.RESEND_API_KEY;
      const fromEmail = campaign.from_email || workspace?.email_from_address || 'onboarding@resend.dev';

      // 4. Fetch contacts (recipients) in the workspace using select('*') to handle arbitrary columns safely
      const { data: contacts, error: contactErr } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('workspace_id', campaign.workspace_id);

      if (contactErr || !contacts || contacts.length === 0) {
        console.warn(`[Campaign Cron] No contacts found for campaign ${campaign.id} in workspace ${campaign.workspace_id}`);
        await supabaseAdmin
          .from('email_campaigns')
          .update({ status: 'sent', sent_at: now.toISOString(), total_sent: 0 })
          .eq('id', campaign.id);
        processedCount++;
        continue;
      }

      // Retrieve progress lists from campaign's segment JSONB
      const segmentObj = (campaign.segment || {}) as any;
      const sentContactIds: string[] = Array.isArray(segmentObj.sent_contact_ids) ? segmentObj.sent_contact_ids : [];
      let campaignSentCount = campaign.total_sent || 0;
      let hasRemainingContacts = false;
      const newSentIds = [...sentContactIds];

      // 5. Process send loops with EskomSePush + optimal time checks
      for (const contact of contacts) {
        if (!contact.email) continue;
        if (sentContactIds.includes(contact.id)) continue; // Skip already sent contacts

        // Resolve optimized send time for this contact
        const baseDate = campaign.scheduled_at ? new Date(campaign.scheduled_at) : now;
        const optimizedTime = await PredictiveIntelligence.getOptimizedSendTime(contact, baseDate);

        if (optimizedTime.getTime() > now.getTime()) {
          // Scheduled for a future time slot (e.g. because of load-shedding shift or later optimal open hour)
          hasRemainingContacts = true;
          continue;
        }

        try {
          await sendEmail({
            to: contact.email,
            subject: campaign.subject,
            html: campaign.body_html || '<p>No content provided</p>',
            config: {
              apiKey,
              fromEmail,
              fromName: campaign.from_name || 'LeadsMind',
              // Attach tags so Resend returns them in webhook events
              tags: [
                { name: 'campaign_id', value: campaign.id },
                { name: 'contact_id', value: contact.id }
              ]
            }
          });
          campaignSentCount++;
          newSentIds.push(contact.id);
        } catch (sendErr: any) {
          console.error(`[Campaign Cron] Failed sending to ${contact.email}:`, sendErr.message);
          // Mark as processed anyway to prevent infinite retry loops in future cron runs
          newSentIds.push(contact.id);
        }
      }

      // 6. Update campaign progress
      const updatedSegment = {
        ...segmentObj,
        sent_contact_ids: newSentIds
      };

      if (hasRemainingContacts) {
        // Keep status as "sending" to continue processing in the next cron sweep
        await supabaseAdmin
          .from('email_campaigns')
          .update({
            segment: updatedSegment,
            total_sent: campaignSentCount
          })
          .eq('id', campaign.id);
      } else {
        // All contacts fully processed, mark campaign as "sent"
        await supabaseAdmin
          .from('email_campaigns')
          .update({
            status: 'sent',
            sent_at: now.toISOString(),
            segment: updatedSegment,
            total_sent: campaignSentCount
          })
          .eq('id', campaign.id);
      }

      processedCount++;
    }

    return NextResponse.json({ success: true, processed: processedCount });
  } catch (error: any) {
    console.error('[Email Campaign Cron API] Failed:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}

