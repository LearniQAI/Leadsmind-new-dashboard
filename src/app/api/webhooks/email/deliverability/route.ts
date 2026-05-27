import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[Deliverability Webhook] Received payload:', JSON.stringify(body));

    let eventType: 'open' | 'click' | 'reply' | 'bounce' | 'complaint' | null = null;
    let campaignId: string | null = null;
    let contactId: string | null = null;
    let linkUrl: string | null = null;
    let userAgent: string | null = null;
    let ipAddress: string | null = null;

    // 1. Resend Webhook Payload Format
    if (body.type && body.data) {
      const typeStr = body.type;
      if (typeStr === 'email.opened') eventType = 'open';
      else if (typeStr === 'email.clicked') eventType = 'click';
      else if (typeStr === 'email.bounced') eventType = 'bounce';
      else if (typeStr === 'email.complained') eventType = 'complaint';

      const tags = body.data.tags;
      if (tags) {
        if (typeof tags === 'object' && !Array.isArray(tags)) {
          campaignId = tags.campaign_id;
          contactId = tags.contact_id;
        } else if (Array.isArray(tags)) {
          const cTag = tags.find((t: any) => t.name === 'campaign_id');
          const ctTag = tags.find((t: any) => t.name === 'contact_id');
          if (cTag) campaignId = cTag.value;
          if (ctTag) contactId = ctTag.value;
        }
      }

      if (body.data.click) {
        linkUrl = body.data.click.url;
      }
      if (body.data.open) {
        userAgent = body.data.open.user_agent;
        ipAddress = body.data.open.ip_address;
      }
    }
    // 2. AWS SES SNS Payload Format
    else if (body.EventType) {
      const typeStr = body.EventType;
      if (typeStr === 'Open') eventType = 'open';
      else if (typeStr === 'Click') eventType = 'click';
      else if (typeStr === 'Bounce') eventType = 'bounce';
      else if (typeStr === 'Complaint') eventType = 'complaint';

      const tags = body.mail?.tags;
      if (tags) {
        campaignId = Array.isArray(tags.campaign_id) ? tags.campaign_id[0] : tags.campaign_id;
        contactId = Array.isArray(tags.contact_id) ? tags.contact_id[0] : tags.contact_id;
      }
      
      if (body.click) {
        linkUrl = body.click.link;
      }
      if (body.open) {
        ipAddress = body.open.ipAddress;
        userAgent = body.open.userAgent;
      }
    }
    // 3. Generic Flat JSON Testing Format
    else {
      eventType = body.event_type;
      campaignId = body.campaign_id;
      contactId = body.contact_id;
      linkUrl = body.link_url;
      userAgent = body.user_agent;
      ipAddress = body.ip_address;
    }

    // Validation
    if (!eventType || !campaignId) {
      console.warn('[Deliverability Webhook] Missing eventType or campaignId. Payload skipped.');
      return NextResponse.json({ received: true, status: 'ignored' });
    }

    // 2. Lookup Campaign Workspace to satisfy foreign key RLS constraints
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('email_campaigns')
      .select('workspace_id')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error(`[Deliverability Webhook] Campaign not found for ID: ${campaignId}`);
      return NextResponse.json({ error: 'Campaign reference not found.' }, { status: 400 });
    }

    // 3. Log event trace in email_tracking_logs
    const { error: logError } = await supabaseAdmin
      .from('email_tracking_logs')
      .insert({
        workspace_id: campaign.workspace_id,
        campaign_id: campaignId,
        contact_id: contactId || null,
        event_type: eventType,
        link_url: linkUrl || null,
        user_agent: userAgent || null,
        ip_address: ipAddress || null,
      });

    if (logError) {
      console.error('[Deliverability Webhook] Failed to insert tracking log:', logError.message);
      return NextResponse.json({ error: 'Failed to record tracking event.' }, { status: 500 });
    }

    // 3.5 Trigger Lead Scoring Pipeline
    if (contactId && (eventType === 'open' || eventType === 'click' || eventType === 'reply')) {
      const { LeadScoringEngine } = await import('@/lib/intelligence/LeadScoringEngine');
      LeadScoringEngine.trackScoringEvent(contactId, eventType, {
        linkUrl: linkUrl || undefined,
        campaignId: campaignId
      }).catch(err => console.error('[Deliverability Webhook] Scoring trigger failed:', err));
    }

    // 4. Atomically increment stats counter in email_campaigns via postgres RPC
    const { error: rpcError } = await supabaseAdmin.rpc('increment_campaign_metric', {
      c_id: campaignId,
      metric_name: eventType
    });

    if (rpcError) {
      console.error('[Deliverability Webhook] RPC metric increment failed:', rpcError.message);
      // Fallback: update using standard non-atomic fetch-and-update (less reliable, but safe fallback)
      try {
        const { data: currentCampaign } = await supabaseAdmin
          .from('email_campaigns')
          .select('opens, clicks, replied, bounces, complaints')
          .eq('id', campaignId)
          .single();

        if (currentCampaign) {
          const updatePayload: any = {};
          if (eventType === 'open') updatePayload.opens = (currentCampaign.opens || 0) + 1;
          if (eventType === 'click') updatePayload.clicks = (currentCampaign.clicks || 0) + 1;
          if (eventType === 'reply') updatePayload.replied = (currentCampaign.replied || 0) + 1;
          if (eventType === 'bounce') updatePayload.bounces = (currentCampaign.bounces || 0) + 1;
          if (eventType === 'complaint') updatePayload.complaints = (currentCampaign.complaints || 0) + 1;

          await supabaseAdmin
            .from('email_campaigns')
            .update(updatePayload)
            .eq('id', campaignId);
        }
      } catch (fallbackErr) {
        console.error('[Deliverability Webhook] Fallback increment update failed:', fallbackErr);
      }
    }

    // 5. Ingest bounce and delivery stats to contacts & crm_contacts
    let recipientEmail: string | null = null;
    if (body.type && body.data?.to) {
      recipientEmail = Array.isArray(body.data.to) ? body.data.to[0] : body.data.to;
    } else if (body.mail?.destination) {
      recipientEmail = Array.isArray(body.mail.destination) ? body.mail.destination[0] : body.mail.destination;
    } else if (body.email) {
      recipientEmail = body.email;
    }

    if (recipientEmail) {
      let isHardBounce = false;
      let isSoftBounce = false;
      let isDeliverySuccess = false;

      if (eventType === 'bounce') {
        const typeStr = body.type || '';
        const eventTypeStr = body.EventType || '';
        const genericType = body.bounce_type || body.sub_type || '';

        if (typeStr === 'email.bounced') {
          const bounceType = body.data?.bounceType || body.data?.type || '';
          if (bounceType.toLowerCase().includes('permanent') || bounceType.toLowerCase() === 'hard') {
            isHardBounce = true;
          } else {
            isSoftBounce = true;
          }
        } else if (eventTypeStr === 'Bounce') {
          const bounceType = body.bounce?.bounceType || '';
          if (bounceType === 'Permanent') {
            isHardBounce = true;
          } else {
            isSoftBounce = true;
          }
        } else {
          if (genericType.toLowerCase() === 'hard' || genericType.toLowerCase() === 'permanent') {
            isHardBounce = true;
          } else {
            isSoftBounce = true;
          }
        }
      } else if (body.type === 'email.delivered' || body.EventType === 'Delivery' || body.event_type === 'delivered' || body.event_type === 'success') {
        isDeliverySuccess = true;
      }

      if (isHardBounce || eventType === 'complaint') {
        // Mark as invalid instantly
        await supabaseAdmin
          .from('contacts')
          .update({ is_invalid_email: true })
          .eq('workspace_id', campaign.workspace_id)
          .eq('email', recipientEmail);

        await supabaseAdmin
          .from('crm_contacts')
          .update({ is_invalid_email: true })
          .eq('workspace_id', campaign.workspace_id)
          .eq('email', recipientEmail);
          
      } else if (isSoftBounce) {
        // Process soft bounce
        const { data: matchedContacts } = await supabaseAdmin
          .from('contacts')
          .select('id, soft_bounce_count, consecutive_soft_bounces')
          .eq('workspace_id', campaign.workspace_id)
          .eq('email', recipientEmail);

        if (matchedContacts) {
          for (const c of matchedContacts) {
            const nextConsecutive = (c.consecutive_soft_bounces || 0) + 1;
            const nextTotal = (c.soft_bounce_count || 0) + 1;
            const flagInvalid = nextConsecutive >= 3 || nextTotal >= 5;

            await supabaseAdmin
              .from('contacts')
              .update({
                soft_bounce_count: nextTotal,
                consecutive_soft_bounces: nextConsecutive,
                is_invalid_email: flagInvalid ? true : undefined
              })
              .eq('id', c.id);
          }
        }

        const { data: matchedCrm } = await supabaseAdmin
          .from('crm_contacts')
          .select('id, soft_bounce_count, consecutive_soft_bounces')
          .eq('workspace_id', campaign.workspace_id)
          .eq('email', recipientEmail);

        if (matchedCrm) {
          for (const c of matchedCrm) {
            const nextConsecutive = (c.consecutive_soft_bounces || 0) + 1;
            const nextTotal = (c.soft_bounce_count || 0) + 1;
            const flagInvalid = nextConsecutive >= 3 || nextTotal >= 5;

            await supabaseAdmin
              .from('crm_contacts')
              .update({
                soft_bounce_count: nextTotal,
                consecutive_soft_bounces: nextConsecutive,
                is_invalid_email: flagInvalid ? true : undefined
              })
              .eq('id', c.id);
          }
        }
      } else if (isDeliverySuccess) {
        // Reset consecutive soft bounces
        await supabaseAdmin
          .from('contacts')
          .update({ consecutive_soft_bounces: 0 })
          .eq('workspace_id', campaign.workspace_id)
          .eq('email', recipientEmail);

        await supabaseAdmin
          .from('crm_contacts')
          .update({ consecutive_soft_bounces: 0 })
          .eq('workspace_id', campaign.workspace_id)
          .eq('email', recipientEmail);
      }
    }

    return NextResponse.json({ received: true, status: 'processed' });
  } catch (error: any) {
    console.error('[Deliverability Webhook] Unhandled exception:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
