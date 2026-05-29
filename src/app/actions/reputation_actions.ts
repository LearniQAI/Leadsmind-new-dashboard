'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email';
import { sendSMS } from '@/lib/sms';

export async function respondToReview(reviewId: string, response: string) {
  try {
   const workspaceId = await getCurrentWorkspaceId();
   if (!workspaceId) return { error: 'No workspace active' };

   const supabase = await createServerClient();
   const { data, error } = await supabase
    .from('reviews')
    .update({
     reply_text: response,
     replied: true,
     replied_at: new Date().toISOString()
    })
    .eq('id', reviewId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

   if (error) throw error;
   revalidatePath('/reputation');
   return { data };
  } catch (error: any) {
   return { error: error.message };
  }
}

export async function deleteReview(reviewId: string) {
  try {
   const workspaceId = await getCurrentWorkspaceId();
   if (!workspaceId) return { error: 'No workspace active' };

   const supabase = await createServerClient();
   const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .eq('workspace_id', workspaceId);

   if (error) throw error;
   revalidatePath('/reputation');
   return { success: true };
  } catch (error: any) {
   return { error: error.message };
  }
}

// Fetch reputation settings for the active workspace
export async function getReputationSettings() {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('reputation_settings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { data: data || null };
  } catch (error: any) {
    return { error: error.message };
  }
}

// Save reputation settings for the active workspace
export async function saveReputationSettings(updates: { google_review_url: string; facebook_review_url: string }) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();

    // Check if settings record already exists
    const { data: existing } = await supabase
      .from('reputation_settings')
      .select('id')
      .eq('workspace_id', workspaceId)
      .single();

    let result;
    if (existing) {
      result = await supabase
        .from('reputation_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('workspace_id', workspaceId)
        .select()
        .single();
    } else {
      result = await supabase
        .from('reputation_settings')
        .insert({
          workspace_id: workspaceId,
          ...updates
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;
    revalidatePath('/reputation');
    return { success: true, data: result.data };
  } catch (error: any) {
    return { error: error.message };
  }
}

// Fetch public settings for visitor feedback page (unauthenticated)
export async function getPublicReputationSettings(workspaceId: string) {
  try {
    const supabase = createAdminClient();
    
    // Fetch review URLs
    const { data: settings } = await supabase
      .from('reputation_settings')
      .select('google_review_url, facebook_review_url')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    // Fetch workspace logo and name
    const { data: branding } = await supabase
      .from('workspace_branding')
      .select('logo_url, platform_name')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name, logo_url')
      .eq('id', workspaceId)
      .single();

    return {
      data: {
        google_review_url: settings?.google_review_url || '',
        facebook_review_url: settings?.facebook_review_url || '',
        logo_url: branding?.logo_url || workspace?.logo_url || '',
        workspace_name: branding?.platform_name || workspace?.name || 'LeadsMind Client'
      }
    };
  } catch (error: any) {
    console.error('[getPublicReputationSettings] Error:', error);
    return { error: error.message };
  }
}

// Submit internal private feedback (for negative review gatekeeping)
export async function submitPrivateFeedback(workspaceId: string, reviewerName: string, rating: number, body: string) {
  try {
    const supabase = createAdminClient(); // Bypasses RLS since client visitors aren't logged in
    
    const feedbackId = `internal_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        workspace_id: workspaceId,
        platform: null, // Indicates private internal review
        external_review_id: feedbackId,
        reviewer_name: reviewerName || 'Anonymous Customer',
        rating,
        body,
        replied: false,
        review_date: new Date().toISOString(),
        fetched_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Send a real-time email alert to the workspace owner/support about this negative feedback
    try {
      const { data: branding } = await supabase
        .from('workspace_branding')
        .select('support_email')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('name, owner:users(email)')
        .eq('id', workspaceId)
        .maybeSingle();

      const targetEmail = branding?.support_email || (workspace as any)?.owner?.email;
      if (targetEmail) {
        await sendEmail({
          to: targetEmail,
          subject: `Negative Feedback Alert: ${rating}-Star Review Received`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #fca5a5; border-radius: 16px; background-color: #0f172a; color: #f8fafc;">
              <h2 style="color: #ef4444; font-size: 20px; margin-top: 0;">Negative Review Gatekeeper Alert</h2>
              <p style="color: #94a3b8; font-size: 13px;">A customer submitted negative feedback on your custom routed page. It has been held privately inside your LeadsMind Dashboard instead of going to public platforms.</p>
              
              <div style="margin: 20px 0; padding: 20px; background-color: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
                <p style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; color: #ef4444; font-weight: bold; letter-spacing: 1px;">Customer Details</p>
                <p style="margin: 0; font-size: 15px; font-weight: bold;">${reviewerName || 'Anonymous'}</p>
                <p style="margin: 8px 0 0 0; font-size: 14px; color: #e2e8f0;">Rating: <strong style="color: #fbbf24;">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)</strong></p>
                <p style="margin: 12px 0 0 0; font-size: 13px; font-style: italic; color: #cbd5e1; line-height: 1.5;">"${body}"</p>
              </div>
              <p style="color: #64748b; font-size: 11px; margin-bottom: 0;">Logged in dashboard. Open reputation manager to reply to the client.</p>
            </div>
          `
        });
      }
    } catch (mailErr) {
      console.error('[submitPrivateFeedback] Alert email send failed:', mailErr);
    }

    return { success: true, data };
  } catch (error: any) {
    return { error: error.message };
  }
}

// Trigger a review campaign email/SMS/WhatsApp to a contact
export async function sendReviewRequest(contactId: string, channel: 'email' | 'sms' | 'whatsapp') {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();

    // Fetch contact details
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      return { error: 'Contact not found or invalid' };
    }

    // Fetch workspace details for customization
    const { data: branding } = await supabase
      .from('workspace_branding')
      .select('platform_name')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single();

    const workspaceName = branding?.platform_name || workspace?.name || 'our business';
    const feedbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/feedback?workspaceId=${workspaceId}&contactId=${contactId}`;

    // Create log in review_requests table
    const { error: logError } = await supabase
      .from('review_requests')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        channel,
        status: 'sent',
        sent_at: new Date().toISOString()
      });

    if (logError) throw logError;

    const contactName = contact.first_name || 'there';

    if (channel === 'email') {
      if (!contact.email) return { error: 'Contact has no email registered' };
      
      await sendEmail({
        to: contact.email,
        subject: `How was your experience with ${workspaceName}?`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #3b82f6; border-radius: 16px; background-color: #04091a; color: #eef2ff;">
            <h2 style="color: #3b82f6; font-size: 22px; margin-top: 0; text-transform: uppercase;">We Value Your <span style="color: #ffffff;">Feedback</span></h2>
            <p style="color: #94a3c8; font-size: 14px; line-height: 1.5;">Hi ${contactName},</p>
            <p style="color: #94a3c8; font-size: 14px; line-height: 1.5;">Thank you for choosing <strong>${workspaceName}</strong>. We constantly strive to provide the best service possible, and your feedback helps us grow.</p>
            <p style="color: #94a3c8; font-size: 14px; line-height: 1.5;">Could you please take 30 seconds to rate your recent experience? Click the link below to get started:</p>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="${feedbackUrl}" 
                 style="display: inline-block; padding: 14px 40px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; shadow: 0 0 15px rgba(59,130,246,0.3);">
                Rate Our Service
              </a>
            </div>
            
            <p style="color: #4a5a82; font-size: 12px; border-t: 1px solid rgba(255,255,255,0.05); pt: 15px;">If the button above does not work, copy and paste this link into your browser: <br/> ${feedbackUrl}</p>
          </div>
        `
      });
    } else if (channel === 'sms' || channel === 'whatsapp') {
      if (!contact.phone) return { error: 'Contact has no phone number registered' };

      const messageText = `Hi ${contactName}, how was your experience with ${workspaceName}? We would love to hear your feedback. Please rate us here: ${feedbackUrl}`;
      const to = channel === 'whatsapp' ? `whatsapp:${contact.phone}` : contact.phone;
      
      // Fetch workspace Twilio config if available
      const { data: wsCreds } = await supabase
        .from('automations')
        .select('settings')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      const config = {
        accountSid: wsCreds?.settings?.twilio_sid || null,
        authToken: wsCreds?.settings?.twilio_token || null,
        fromNumber: channel === 'whatsapp' 
          ? `whatsapp:${wsCreds?.settings?.twilio_number || process.env.TWILIO_PHONE_NUMBER}`
          : (wsCreds?.settings?.twilio_number || process.env.TWILIO_PHONE_NUMBER)
      };

      await sendSMS({
        to,
        message: messageText,
        config
      });
    }

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
