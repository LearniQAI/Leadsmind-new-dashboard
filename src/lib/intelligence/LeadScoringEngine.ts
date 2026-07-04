import { createAdminClient } from '@/lib/supabase/server';

export const LeadScoringEngine = {
  /**
   * Evaluates incoming tracked events, adjusts lead score, cancels sequences
   * on replies, adds tags (High Intent, Hot Lead), and triggers notifications.
   */
  async trackScoringEvent(
    contactId: string,
    eventType: 'open' | 'click' | 'reply',
    metadata: { linkUrl?: string; campaignId?: string } = {}
  ): Promise<void> {
    const supabase = createAdminClient();

    try {
      // 1. Fetch contact details
      const { data: contact, error: cErr } = await supabase
        .from('contacts')
        .select('id, workspace_id, lead_score, lead_score_explanation, tags, owner_id, created_at')
        .eq('id', contactId)
        .single();

      if (cErr || !contact) {
        console.warn(`[LeadScoringEngine] Contact ${contactId} not found. Skipping scoring update.`);
        return;
      }

      const workspaceId = contact.workspace_id;
      let scoreAdjustment = 0;
      const explanations: string[] = [];
      const currentExplanationStr = contact.lead_score_explanation || '';
      let newTags = Array.isArray(contact.tags) ? [...contact.tags] : [];

      // 2. Evaluate Scoring Actions
      // 2.a Email Reply
      if (eventType === 'reply') {
        scoreAdjustment += 20;
        explanations.push('+20 points: Customer email reply detected');

        // Pull contact out of active sequence executions
        const { error: cancelErr } = await supabase
          .from('workflow_executions')
          .update({ status: 'cancelled', completed_at: new Date().toISOString() })
          .eq('contact_id', contactId)
          .eq('status', 'running');

        if (cancelErr) {
          console.error('[LeadScoringEngine] Failed to cancel workflow executions:', cancelErr.message);
        } else {
          console.log(`[LeadScoringEngine] Active sequences cancelled for contact ${contactId}`);
        }

        // Notify sales admins/owner (account rep)
        const alertUsers = new Set<string>();
        if (contact.owner_id) alertUsers.add(contact.owner_id);

        const { data: admins } = await supabase
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', workspaceId)
          .eq('role', 'admin');

        (admins || []).forEach(a => {
          if (a.user_id) alertUsers.add(a.user_id);
        });

        for (const userId of Array.from(alertUsers)) {
          await supabase.from('notifications').insert({
            workspace_id: workspaceId,
            user_id: userId,
            type: 'system',
            title: 'Email Reply Detected',
            message: `Lead has replied. Active automation sequences cancelled.`,
            link: '/contacts'
          });
        }
      }

      // 2.b Pricing Page Link Click
      else if (eventType === 'click') {
        const linkUrl = metadata.linkUrl || '';
        if (linkUrl.toLowerCase().includes('pricing')) {
          scoreAdjustment += 15;
          explanations.push('+15 points: Pricing page link clicked (high intent)');
          if (!newTags.includes('High Intent')) {
            newTags.push('High Intent');
          }
        }
      }

      // 2.c Open Event & Consecutive Unopened Campaign Count
      else if (eventType === 'open') {
        const consecutiveUnopened = await this.calculateConsecutiveUnopened(
          contactId,
          workspaceId,
          contact.created_at,
          supabase
        );

        const alreadyApplied = currentExplanationStr.includes('consecutive_unopened_applied');

        if (consecutiveUnopened >= 6 && !alreadyApplied) {
          scoreAdjustment -= 10;
          explanations.push('-10 points: 6+ consecutive unopened campaigns (consecutive_unopened_applied)');
        } else if (consecutiveUnopened < 6 && alreadyApplied) {
          // Revert deduction since the streak is now broken by this open event
          scoreAdjustment += 10;
          explanations.push('+10 points: Consecutive unopened campaign streak broken');
        }
      }

      // 3. Compile final score and explanation
      let finalScore = (contact.lead_score || 0) + scoreAdjustment;
      finalScore = Math.max(0, finalScore); // Avoid negative scoring

      let finalExplanation = currentExplanationStr;
      if (explanations.length > 0) {
        const dateTag = `[${new Date().toISOString().substring(0, 10)}]`;
        finalExplanation = finalExplanation 
          ? `${finalExplanation}\n${dateTag} ${explanations.join('; ')}`
          : `${dateTag} ${explanations.join('; ')}`;
      }

      // 4. Hot Lead Threshold Crossing (50 points trigger)
      const threshold = 50;
      const isHotLead = finalScore >= threshold;
      const wasHotLead = (contact.tags || []).includes('Hot Lead');

      if (isHotLead && !wasHotLead) {
        if (!newTags.includes('Hot Lead')) {
          newTags.push('Hot Lead');
        }

        // Push alert to account rep (owner_id) and workspace admins
        const alertUsers = new Set<string>();
        if (contact.owner_id) {
          alertUsers.add(contact.owner_id);
        }

        const { data: admins } = await supabase
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', workspaceId)
          .eq('role', 'admin');

        (admins || []).forEach(a => {
          if (a.user_id) alertUsers.add(a.user_id);
        });

        for (const userId of Array.from(alertUsers)) {
          await supabase.from('notifications').insert({
            workspace_id: workspaceId,
            user_id: userId,
            type: 'contact',
            title: '🔥 Hot Lead Promoted!',
            message: `Lead score crossed threshold (${finalScore}/${threshold}). Profile added to Hot Leads.`,
            link: '/contacts'
          });
        }
      }

      // 5. Save changes back to database
      // Update contacts
      await supabase
        .from('contacts')
        .update({
          lead_score: finalScore,
          lead_score_explanation: finalExplanation,
          tags: newTags
        })
        .eq("id", contactId).eq("workspace_id", workspaceId);

      // Check and update crm_contacts if it exists
      await supabase
        .from('crm_contacts')
        .update({
          lead_score: finalScore,
          lead_score_explanation: finalExplanation,
          tags: newTags
        })
        .eq("id", contactId).eq("workspace_id", workspaceId);

      console.log(`[LeadScoringEngine] Score updated for contact ${contactId}: ${finalScore} points (Adjustment: ${scoreAdjustment})`);
    } catch (err: any) {
      console.error('[LeadScoringEngine] Unexpected execution error:', err.message);
    }
  },

  /**
   * Helper: Calculates the number of consecutive campaigns sent to a contact
   * that they have not opened (evaluating from most recent to oldest).
   */
  async calculateConsecutiveUnopened(
    contactId: string,
    workspaceId: string,
    contactCreatedAt: string,
    supabase: any
  ): Promise<number> {
    try {
      const { data: campaigns, error: campErr } = await supabase
        .from('email_campaigns')
        .select('id, sent_at')
        .eq('workspace_id', workspaceId)
        .eq('status', 'sent')
        .gte('sent_at', contactCreatedAt)
        .order('sent_at', { ascending: false })
        .limit(10);

      if (campErr || !campaigns || campaigns.length === 0) {
        return 0;
      }

      let consecutive = 0;
      for (const campaign of campaigns) {
        // Query tracking log for an open event
        const { data: openLog, error: logErr } = await supabase
          .from('email_tracking_logs')
          .select('id')
          .eq('contact_id', contactId)
          .eq('campaign_id', campaign.id)
          .eq('event_type', 'open')
          .maybeSingle();

        if (openLog && !logErr) {
          break; // open event breaks the streak
        }
        consecutive++;
      }
      return consecutive;
    } catch (err) {
      console.error('[LeadScoringEngine] calculateConsecutiveUnopened failed:', err);
      return 0;
    }
  }
};
