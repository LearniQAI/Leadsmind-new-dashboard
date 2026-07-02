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
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const nowStr = now.toISOString();

    // 1. Fetch campaigns that are scheduled and ready to send, or currently in progress ("sending")
    // Added stale recovery: limit to 5 per tick, process oldest updated first.
    const { data: campaigns, error: fetchErr } = await supabaseAdmin
      .from('email_campaigns')
      .select('*')
      .or(`status.eq.sending,and(status.eq.scheduled,scheduled_at.lte.${nowStr})`)
      .order('updated_at', { ascending: true })
      .limit(5);

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

      // Retrieve build progress
      let segmentObj: any = {};
      try {
         segmentObj = (typeof campaign.segment === 'object' && campaign.segment !== null) ? campaign.segment : {};
      } catch (e) {
         console.error('[Campaign Cron] Segment payload corruption detected.');
      }
      
      const CHUNK_SIZE = 1000; // Batch insert 1000 queue jobs at a time
      const currentOffset = segmentObj.current_offset || 0;
      
      let contactQuery = supabaseAdmin
         .from('contacts')
         .select('id')
         .eq('workspace_id', campaign.workspace_id);
         
      if (segmentObj.tags && Array.isArray(segmentObj.tags) && segmentObj.tags.length > 0) {
         contactQuery = contactQuery.overlaps('tags', segmentObj.tags);
      }
      
      const { data: pagedData, error: contactErr } = await contactQuery
         .order('id', { ascending: true })
         .range(currentOffset, currentOffset + CHUNK_SIZE - 1);
         
      if (contactErr) {
         console.error('[Campaign Cron] DB pagination error:', contactErr.message);
         continue;
      }
      const contacts = pagedData || [];

      if (contacts.length === 0) {
         // Finished building queue. 
         // If this is an automated evergreen campaign, leave it as 'scheduled' so it keeps polling.
         const nextStatus = segmentObj.is_automated ? 'scheduled' : 'queued';
         await supabaseAdmin.from('email_campaigns').update({
             status: nextStatus,
             segment: { ...segmentObj, current_offset: 0 }, // Reset offset for the next automated sweep
             updated_at: now.toISOString()
         }).eq('id', campaign.id);
         continue;
      }

      // Filter out contacts that are already in the queue or sent for this campaign
      const { data: existingJobs } = await supabaseAdmin
         .from('campaign_dispatch_queue')
         .select('contact_id')
         .eq('campaign_id', campaign.id)
         .in('contact_id', contacts.map(c => c.id));
         
      const existingContactIds = new Set(existingJobs?.map(j => j.contact_id) || []);
      const newContacts = contacts.filter(c => !existingContactIds.has(c.id));

      if (newContacts.length > 0) {
        // Generate queue records for this chunk
        const queueRecords = newContacts.map(c => ({
           campaign_id: campaign.id,
           workspace_id: campaign.workspace_id,
           contact_id: c.id,
           status: 'pending',
           scheduled_for: campaign.scheduled_at || now.toISOString()
        }));

        const { error: insertErr } = await supabaseAdmin.from('campaign_dispatch_queue').insert(queueRecords);
        if (insertErr) {
           console.error('[Campaign Cron] Failed to enqueue chunk:', insertErr.message);
           continue;
        }
      }

      // Advance cursor
      const newOffset = currentOffset + contacts.length;
      await supabaseAdmin.from('email_campaigns').update({
         segment: { ...segmentObj, current_offset: newOffset },
         updated_at: now.toISOString()
      }).eq('id', campaign.id);

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

