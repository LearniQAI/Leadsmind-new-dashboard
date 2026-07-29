import { createServerClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import { calculateLeadScore } from "../../app/actions/automation";
import { enrollStudent, updateProgress } from "../../app/actions/lms";
import { UnifiedActivityEngine } from "@/lib/crm/UnifiedActivityEngine";
import { resolveWorkspaceTwilioCredentials } from "@/lib/twilio/resolveWorkspaceTwilioCredentials";
import { syncContactTagsToRelational } from "@/modules/tags/sync/syncContactTags";

export const AutomationActions = {
 send_email: async (workspaceId: string, contactId: string, config: any) => {
  const supabase = await createServerClient();
  
  // Fetch contact
  const { data: contact } = await supabase
   .from("contacts")
   .select("email, first_name")
   .eq("id", contactId)
   .single();

  if (!contact?.email) throw new Error("Contact has no email address");

  // Fetch workspace settings
  const { data: workspace } = await supabase
   .from("workspaces")
   .select("resend_api_key, email_from_name, email_from_address")
   .eq("id", workspaceId)
   .single();

  const isHtml = config.body?.startsWith('<') || config.isHtml;

  await sendEmail({
   to: contact.email,
   subject: config.subject || "Important Update",
   react: !isHtml ? (config.body || `Hello ${contact.first_name}, this is an automated message.`) : undefined,
   html: isHtml ? config.body : undefined,
   config: {
    apiKey: workspace?.resend_api_key,
    fromEmail: workspace?.email_from_address,
    fromName: workspace?.email_from_name,
   }
  } as any);
 },

 send_sms: async (workspaceId: string, contactId: string, config: any) => {
  const supabase = await createServerClient();
  
  // Fetch contact
  const { data: contact } = await supabase
   .from("contacts")
   .select("phone")
   .eq("id", contactId)
   .single();

  if (!contact?.phone) throw new Error("Contact has no phone number");

  // Fetch workspace settings
  const { data: workspace } = await supabase
   .from("workspaces")
   .select("twilio_sid, twilio_token, twilio_sid_encrypted, twilio_token_encrypted, twilio_number")
   .eq("id", workspaceId)
   .single();

  await sendSMS({
   to: contact.phone,
   message: config.message || "Hi, this is an automated message.",
   config: {
    ...resolveWorkspaceTwilioCredentials(workspace),
    fromNumber: workspace?.twilio_number,
   }
  });
 },

 apply_tag: async (workspaceId: string, contactId: string, config: any) => {
  if (!config?.tag || typeof config.tag !== 'string') {
   console.warn("Automation: apply_tag called without a valid tag string");
   return;
  }

  const supabase = await createServerClient();
  
  // Fetch contact with workspace security check
  const { data: contact } = await supabase
   .from("contacts")
   .select("tags")
   .eq("id", contactId)
   .eq("workspace_id", workspaceId)
   .single();

  if (!contact) {
   console.warn(`Automation: contact ${contactId} not found in workspace ${workspaceId}`);
   return;
  }

  const currentTags = contact.tags || [];
  const tagName = config.tag.trim();
  
  if (currentTags.includes(tagName)) return; // Tag already exists

  const newTags = [...currentTags, tagName];

  const { error } = await supabase
   .from("contacts")
   .update({ tags: newTags })
   .eq("id", contactId)
   .eq("workspace_id", workspaceId);

  if (error) throw error;

  syncContactTagsToRelational(workspaceId, contactId, newTags).catch(() => {});
 },

 add_tag: async (workspaceId: string, contactId: string, config: any) => {
  return (AutomationActions as any).apply_tag(workspaceId, contactId, config);
 },

 lead_score: async (workspaceId: string, contactId: string) => {
  await calculateLeadScore(contactId);
 },

 update_lead_score: async (workspaceId: string, contactId: string, config: any) => {
  const { points = 1 } = config;
  const supabase = await createServerClient();
  
  // Use an atomic update via RPC if possible, but here we can just update
  // since we are in a server action context. Note: SQL increment is safer.
  const { data: contact } = await supabase
   .from("contacts")
   .select("lead_score")
   .eq("id", contactId)
   .single();

  const currentScore = contact?.lead_score || 0;
  const newScore = currentScore + Number(points);

  await supabase
   .from("contacts")
   .update({ lead_score: newScore })
   .eq("id", contactId);
 },

 set_grade_tag: async (workspaceId: string, contactId: string, config: any) => {
  const { grade } = config;
  if (!grade) return;

  const supabase = await createServerClient();
  await supabase
   .from("contacts")
   .update({ lead_grade: grade })
   .eq("id", contactId);
 },

  social_post: async (workspaceId: string, contactId: string, config: any) => {
   const { content, platforms } = config;
   if (!content || !platforms) return;

   // Create and publish social post
   const result = await (await import("../../app/actions/social")).createSocialPost({
    content,
    platforms
   });

   if (result.success) {
    // Post published directly via createSocialPost - no separate publish step needed
   }
  },

  lms_enroll: async (workspaceId: string, contactId: string, config: any) => {
   const { lms_enroll } = await import("./lms_actions");
   await lms_enroll(workspaceId, contactId, config);
  },

  lms_enroll_bundle: async (workspaceId: string, contactId: string, config: any) => {
   const { lms_enroll_bundle } = await import("./lms_actions");
   await lms_enroll_bundle(workspaceId, contactId, config);
  },

  lms_revoke_access: async (workspaceId: string, contactId: string, config: any) => {
   const { lms_revoke_access } = await import("./lms_actions");
   await lms_revoke_access(workspaceId, contactId, config);
  },

  update_community_privilege: async (workspaceId: string, contactId: string, config: any) => {
   const { update_community_privilege } = await import("./lms_actions");
   await update_community_privilege(workspaceId, contactId, config);
  },

  send_whatsapp_template: async (workspaceId: string, contactId: string, config: any) => {
   const { send_whatsapp_template } = await import("./lms_actions");
   await send_whatsapp_template(workspaceId, contactId, config);
  },

 lms_update_progress: async (workspaceId: string, contactId: string, config: any) => {
  const { lessonId, completed } = config;
  if (!lessonId) return;
  await updateProgress(contactId, lessonId, !!completed, 0);
 },

 update_field: async (workspaceId: string, contactId: string, config: any) => {
  const { field, value } = config;
  if (!field) return;

  const supabase = await createServerClient();
  const { error } = await supabase
   .from("contacts")
   .update({ [field]: value })
   .eq("id", contactId)
   .eq("workspace_id", workspaceId);

  if (error) throw error;
 },

 move_to_stage: async (workspaceId: string, contactId: string, config: any) => {
  const { stageId } = config;
  if (!stageId) return;

  const supabase = await createServerClient();
  
  // Find the latest opportunity for this contact
  const { data: opportunity } = await supabase
   .from("opportunities")
   .select("id")
   .eq("contact_id", contactId)
   .eq("workspace_id", workspaceId)
   .order("created_at", { ascending: false })
   .limit(1)
   .single();

  if (opportunity) {
   await supabase
    .from("opportunities")
    .update({ stage_id: stageId })
    .eq("id", opportunity.id);
  }
 },

 notify_team: async (workspaceId: string, contactId: string, config: any) => {
  const { message, type = "info" } = config;
  const supabase = await createServerClient();

  // Fetch contact name for the notification
  const { data: contact } = await supabase
   .from("contacts")
   .select("first_name, last_name")
   .eq("id", contactId)
   .single();

  const contactName = contact ? `${contact.first_name} ${contact.last_name}` : "A contact";
  const finalMessage = message?.replace("{contact_name}", contactName) || `Automation alert for ${contactName}`;

  await supabase.from("notifications").insert({
   workspace_id: workspaceId,
   title: "Automation Triggered",
   message: finalMessage,
   type: type,
   link: `/contacts/${contactId}`
  });
 },

 send_webhook: async (workspaceId: string, contactId: string, config: any) => {
  const { url, method = 'POST', bodyTemplate } = config;
  if (!url) return;

  const supabase = await createServerClient();
  const { data: contact } = await supabase
   .from("contacts")
   .select("*")
   .eq("id", contactId)
   .single();

  if (!contact) return;

  // Helper for Liquid-style token replacement: {{contact.first_name}}
  const replaceTokens = (str: string) => {
   return str.replace(/\{\{contact\.([^}]+)\}\}/g, (_, field) => {
    return contact[field] || "";
   });
  };

  const finalUrl = replaceTokens(url);
  let finalBody = {};

  if (bodyTemplate) {
   try {
    const bodyStr = replaceTokens(bodyTemplate);
    finalBody = JSON.parse(bodyStr);
   } catch (e) {
    console.warn("[executor] Webhook bodyTemplate is not valid JSON, sending default payload.");
    finalBody = { contact, event: "automation_webhook" };
   }
  } else {
   finalBody = {
    event: "automation_webhook",
    workspace_id: workspaceId,
    contact: contact,
    timestamp: new Date().toISOString()
   };
  }

  try {
   const response = await fetch(finalUrl, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(finalBody)
   });
   
   if (!response.ok) {
    console.error(`[executor] Webhook failed with status ${response.status}`);
   }
  } catch (err) {
   console.error("[executor] Webhook failed:", err);
  }
 },

  send_whatsapp_voice: async (workspaceId: string, contactId: string, config: any) => {
    const supabase = await createServerClient();
    
    // 1. Fetch contact details
    const { data: contact } = await supabase
     .from("contacts")
     .select("phone, first_name")
     .eq("id", contactId)
     .single();

    if (!contact?.phone) throw new Error("Contact has no phone number");

    // 2. Fetch workspace settings
    const { data: workspace } = await supabase
     .from("workspaces")
     .select("twilio_sid, twilio_token, twilio_sid_encrypted, twilio_token_encrypted, twilio_number, name, whatsapp_transcript_enabled")
     .eq("id", workspaceId)
     .single();

    // 3. Fetch sender signature
    let senderName = 'Team Member';
    let senderJobTitle = 'AI Developer';
    if (config.senderId) {
      const { data: sender } = await supabase
       .from("users")
       .select("full_name, job_title")
       .eq("id", config.senderId)
       .single();
      if (sender) {
        senderName = sender.full_name || senderName;
        senderJobTitle = sender.job_title || senderJobTitle;
      }
    }

    const cleanPhone = contact.phone.startsWith('+') ? contact.phone : `+${contact.phone}`;
    const to = `whatsapp:${cleanPhone}`;
    const from = `whatsapp:${workspace?.twilio_number || process.env.TWILIO_PHONE_NUMBER}`;
    const creds = resolveWorkspaceTwilioCredentials(workspace);

    // Message 1 (Identity)
    const workspaceName = workspace?.name || 'LeadsMind';
    const msg1Text = `Hi ${contact.first_name || 'there'}, this is ${senderName} — ${senderJobTitle} at ${workspaceName}. I have left you a quick voice message below 👇`;
    
    await sendSMS({
      to,
      message: msg1Text,
      config: {
        ...creds,
        fromNumber: from,
      }
    });

    // Small delay to ensure correct chronological sequence timing
    await new Promise(r => setTimeout(r, 600));

    // Message 2 (Audio Content)
    const audioUrl = config.audioUrl || config.audio_url || '';
    await sendSMS({
      to,
      message: "",
      mediaUrl: audioUrl,
      config: {
        ...creds,
        fromNumber: from,
      }
    });

    // Message 3 (Transcript Context)
    const transcript = config.transcript || config.original_text || '';
    const sendTranscript = config.sendTranscript !== false && workspace?.whatsapp_transcript_enabled !== false;
    
    if (sendTranscript && transcript) {
      await new Promise(r => setTimeout(r, 600));
      const excerpt = transcript.slice(0, 200);
      const msg3Text = `📝 Transcript: ${excerpt}${transcript.length > 200 ? '...' : ''}`;
      
      await sendSMS({
        to,
        message: msg3Text,
        config: {
          ...creds,
          fromNumber: from,
        }
      });
    }

    // Log the activity to the CRM timeline feed
    try {
      await UnifiedActivityEngine.logActivity(
        workspaceId,
        config.senderId || null,
        'contact',
        contactId,
        'voice_note',
        `Sent voice note via WhatsApp.`,
        {
          channel: 'whatsapp',
          audio_url: audioUrl,
          transcript: transcript,
          destination: cleanPhone
        }
      );
    } catch (actErr) {
      console.error('[actions_registry] Failed to log WhatsApp voice activity:', actErr);
    }
  },

  create_opportunity: async (workspaceId: string, contactId: string, config: any) => {
    const supabase = await createServerClient();

    let stageId = config.stageId;
    if (!stageId) {
      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('workspace_id', workspaceId)
        .order('position', { ascending: true })
        .limit(1);
      stageId = stages?.[0]?.id;
    }
    if (!stageId) {
      console.warn(`Automation: create_opportunity found no pipeline stage in workspace ${workspaceId}`);
      return;
    }

    const { data: contact } = await supabase
      .from('contacts')
      .select('first_name, last_name')
      .eq('id', contactId)
      .eq('workspace_id', workspaceId)
      .single();

    await supabase.from('opportunities').insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      stage_id: stageId,
      title: config.title || `${contact?.first_name || 'Contact'} ${contact?.last_name || ''} Opportunity`.trim(),
      value: config.value ?? 0,
      status: 'open',
      position: 0,
    });
  },

  create_invoice: async (workspaceId: string, contactId: string, config: any) => {
    const supabase = await createServerClient();
    const amount = Number(config.amount ?? 0);
    const dueInDays = Number(config.dueInDays ?? 14);
    const dueDate = new Date(Date.now() + dueInDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        amount_due: amount,
        total_amount: amount,
        status: 'draft',
        due_date: dueDate,
        currency: config.currency || 'ZAR',
      })
      .select('id')
      .single();

    if (error) throw error;

    try {
      const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
      dispatchWebhook(workspaceId, 'invoice.created', {
        invoice: { id: invoice.id, amount, currency: config.currency || 'ZAR', status: 'draft', contact_id: contactId },
      }).catch(() => {});
    } catch (e) {
      console.error('[actions_registry] Failed to dispatch invoice.created webhook:', e);
    }
  },

  assign_salesperson: async (workspaceId: string, contactId: string, config: any) => {
    if (!config?.ownerId || typeof config.ownerId !== 'string') {
      console.warn('Automation: assign_salesperson called without a valid ownerId');
      return;
    }

    const supabase = await createServerClient();
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', config.ownerId)
      .maybeSingle();
    if (!membership) {
      console.warn(`Automation: assign_salesperson target ${config.ownerId} is not a member of workspace ${workspaceId}`);
      return;
    }

    await supabase
      .from('contacts')
      .update({ owner_id: config.ownerId })
      .eq('id', contactId)
      .eq('workspace_id', workspaceId);
  },

  // Reuses the same "paste a webhook URL" mechanism as send_webhook — Slack Incoming
  // Webhooks are a plain POST URL, so no dedicated Slack OAuth integration is needed.
  notify_slack: async (workspaceId: string, contactId: string, config: any) => {
    if (!config?.webhookUrl) {
      console.warn('Automation: notify_slack called without a webhookUrl');
      return;
    }

    const supabase = await createServerClient();
    const { data: contact } = await supabase
      .from('contacts')
      .select('first_name, last_name')
      .eq('id', contactId)
      .eq('workspace_id', workspaceId)
      .single();

    const contactName = contact ? `${contact.first_name} ${contact.last_name}` : 'A contact';
    const text = (config.message || `Automation triggered for {contact_name}`).replace('{contact_name}', contactName);

    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        console.error(`[actions_registry] notify_slack webhook failed with status ${response.status}`);
      }
    } catch (err) {
      console.error('[actions_registry] notify_slack webhook failed:', err);
    }
  },

  // Generates a follow-up task suggestion via LLM, metered through the same atomic
  // deduct_ai_credit RPC used by seoChecker.ts/plagiarismChecker.ts — the only
  // confirmed race-safe, RLS-safe credit spend mechanism in this codebase.
  generate_ai_task: async (workspaceId: string, contactId: string, config: any) => {
    const supabase = await createServerClient();

    const { data: canSpend } = await supabase.rpc('deduct_ai_credit', { p_workspace_id: workspaceId, p_amount: 1 });
    if (!canSpend) {
      console.warn(`Automation: generate_ai_task skipped for workspace ${workspaceId} — AI credit limit reached`);
      return;
    }

    const { data: contact } = await supabase
      .from('contacts')
      .select('first_name, last_name, lead_score, tags')
      .eq('id', contactId)
      .eq('workspace_id', workspaceId)
      .single();
    if (!contact) return;

    let title = `Follow up with ${contact.first_name} ${contact.last_name}`;
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.5,
        messages: [
          {
            role: 'user',
            content: `Suggest a single short (under 12 words) CRM follow-up task title for a contact named ${contact.first_name} ${contact.last_name}, lead score ${contact.lead_score ?? 0}, tags: ${(contact.tags || []).join(', ') || 'none'}. Context: ${config.context || 'no additional context'}. Reply with only the task title, no quotes.`,
          },
        ],
      });
      title = completion.choices[0]?.message?.content?.trim() || title;
    } catch (err) {
      console.error('[actions_registry] generate_ai_task LLM call failed, using fallback title:', err);
    }

    await supabase.from('contact_tasks').insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      title,
      status: 'todo',
    });
  },
};
