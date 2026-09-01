// Every real trigger of Engine A actions is system-level — webhooks (Twilio,
// PayFast), cron (tag-expiry), fire-and-forget EventBus.publishEvent calls,
// and portal-contact sessions (getPortalSession(), never a Supabase Auth
// session) — never a genuinely logged-in Supabase Auth dashboard user acting
// on their own scoped permissions. createServerClient() resolves to an
// anon-key, no-session client in exactly those contexts, so RLS silently
// filters every read/write to nothing. Uses the admin client throughout,
// matching the already-correct convention in executor.ts (5/5 sites) and
// Engine B's WorkflowEngine.ts/AutomationLogger.ts.
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { getWorkspaceEmailConfig } from "@/lib/email/resolveConfig";
import { sendSMS } from "@/lib/sms";
import { calculateLeadScore } from "../../app/actions/automation";
import { enrollStudent, updateProgress } from "../../app/actions/lms";
import { UnifiedActivityEngine } from "@/lib/crm/UnifiedActivityEngine";
import { resolveWorkspaceTwilioCredentials } from "@/lib/twilio/resolveWorkspaceTwilioCredentials";
import { syncContactTagsToRelational } from "@/modules/tags/sync/syncContactTags";
import { sendInvoiceEmail } from "@/lib/invoices/sendInvoiceEmail";
import { calculateInvoiceTotals } from "@/lib/invoicing/calculations";

export const AutomationActions = {
 send_email: async (workspaceId: string, contactId: string, config: any) => {
  const supabase = createAdminClient();
  
  // Fetch contact
  const { data: contact } = await supabase
   .from("contacts")
   .select("email, first_name")
   .eq("id", contactId)
   .single();

  if (!contact?.email) throw new Error("Contact has no email address");

  // Workspace's own Resend key/from-address, as configured via the
  // Settings > Email Provider UI (workspace_email_providers, encrypted) —
  // not the legacy plaintext workspaces.resend_api_key/email_from_address
  // columns, which no code path ever writes to.
  const emailConfig = await getWorkspaceEmailConfig(workspaceId);

  const isHtml = config.body?.startsWith('<') || config.isHtml;

  await sendEmail({
   to: contact.email,
   subject: config.subject || "Important Update",
   react: !isHtml ? (config.body || `Hello ${contact.first_name}, this is an automated message.`) : undefined,
   html: isHtml ? config.body : undefined,
   config: {
    apiKey: emailConfig?.apiKey,
    fromEmail: emailConfig?.fromEmail,
    fromName: emailConfig?.fromName,
   }
  } as any);
 },

 send_sms: async (workspaceId: string, contactId: string, config: any) => {
  const supabase = createAdminClient();
  
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

  const supabase = createAdminClient();
  const tagName = config.tag.trim();

  // Atomic append+dedupe in a single UPDATE (no read-then-write window for
  // a concurrent call to race against — see add_contact_tag_atomic).
  const { data: newTags, error } = await supabase.rpc('add_contact_tag_atomic', {
   p_contact_id: contactId,
   p_workspace_id: workspaceId,
   p_tag: tagName
  });

  if (error) throw error;
  if (!newTags) {
   throw new Error(`apply_tag: contact ${contactId} not found in workspace ${workspaceId}`);
  }

  syncContactTagsToRelational(workspaceId, contactId, newTags).catch(() => {});
 },

 add_tag: async (workspaceId: string, contactId: string, config: any) => {
  return (AutomationActions as any).apply_tag(workspaceId, contactId, config);
 },

 // Was referenced by the "LMS Course Recoveries" seed recipe's second step
 // but had no handler here at all -- executor.ts's `if (handler) {...}`
 // silently skips execution (and still marks the step 'completed') when a
 // step type has no registered action, so this step never did anything.
 // Mirrors CRMActionHandler.ts's createTask (a separate, Engine-B-only
 // action dispatcher) with one correction: that version also writes a
 // `priority` field, but contact_tasks has no such column (confirmed
 // against every migration that ever touches this table) -- copying it
 // here would just make every create_task insert fail.
 create_task: async (workspaceId: string, contactId: string, config: any) => {
  const supabase = createAdminClient();

  const { error } = await supabase
   .from("contact_tasks")
   .insert({
    workspace_id: workspaceId,
    contact_id: contactId,
    title: config?.title || 'Workflow Task',
    description: config?.description || 'Automatically created by LeadsMind workflow',
    status: 'todo',
    due_date: config?.dueDate || new Date(Date.now() + 86400000 * 2).toISOString()
   });

  if (error) throw error;
 },

 lead_score: async (workspaceId: string, contactId: string) => {
  await calculateLeadScore(contactId);
 },

 update_lead_score: async (workspaceId: string, contactId: string, config: any) => {
  const { points = 1 } = config;
  const supabase = createAdminClient();

  // Atomic increment in a single UPDATE (see increment_contact_lead_score) —
  // same read-then-write race as apply_tag existed here, just on lead_score
  // instead of tags.
  const { data, error } = await supabase.rpc('increment_contact_lead_score', {
   p_contact_id: contactId,
   p_points: Number(points)
  });

  if (error) throw error;
  const row = data?.[0];
  if (!row?.found) throw new Error(`update_lead_score: contact ${contactId} not found`);
 },

 set_grade_tag: async (workspaceId: string, contactId: string, config: any) => {
  const { grade } = config;
  if (!grade) return;

  const supabase = createAdminClient();
  const { error } = await supabase
   .from("contacts")
   .update({ lead_grade: grade })
   .eq("id", contactId);

  if (error) throw error;
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

  send_whatsapp: async (workspaceId: string, contactId: string, config: any) => {
   const supabase = createAdminClient();

   const { data: contact, error: fetchError } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();

   if (fetchError) throw fetchError;
   if (!contact) throw new Error(`send_whatsapp: contact ${contactId} not found`);
   if (!contact.phone) throw new Error("Contact has no phone number");

   const { data: workspace } = await supabase
    .from("workspaces")
    .select("twilio_sid, twilio_token, twilio_sid_encrypted, twilio_token_encrypted, twilio_number")
    .eq("id", workspaceId)
    .single();

   // Same Liquid-style token replacement convention as send_webhook/send_invoice.
   const replaceTokens = (str: string) => {
    return str.replace(/\{\{contact\.([^}]+)\}\}/g, (_, field) => (contact as any)[field] ?? "");
   };

   const cleanPhone = contact.phone.startsWith("+") ? contact.phone : `+${contact.phone}`;
   const bodyText = replaceTokens(config.body || "");

   await sendSMS({
    to: `whatsapp:${cleanPhone}`,
    message: bodyText,
    config: {
     ...resolveWorkspaceTwilioCredentials(workspace),
     fromNumber: `whatsapp:${workspace?.twilio_number || process.env.TWILIO_PHONE_NUMBER}`,
    }
   });
  },

 lms_update_progress: async (workspaceId: string, contactId: string, config: any) => {
  const { lessonId, completed } = config;
  if (!lessonId) return;
  await updateProgress(contactId, lessonId, !!completed, 0);
 },

 update_field: async (workspaceId: string, contactId: string, config: any) => {
  const { field, value } = config;
  if (!field) return;

  const supabase = createAdminClient();
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

  const supabase = createAdminClient();
  
  // Find the latest opportunity for this contact
  const { data: opportunity, error: fetchError } = await supabase
   .from("opportunities")
   .select("id")
   .eq("contact_id", contactId)
   .eq("workspace_id", workspaceId)
   .order("created_at", { ascending: false })
   .limit(1)
   .single();

  if (fetchError) throw fetchError;
  if (!opportunity) throw new Error(`move_to_stage: no opportunity found for contact ${contactId}`);

  const { error } = await supabase
   .from("opportunities")
   .update({ stage_id: stageId })
   .eq("id", opportunity.id);

  if (error) throw error;
 },

 notify_team: async (workspaceId: string, contactId: string, config: any) => {
  // notifications.type is CHECK-constrained to
  // ('message','contact','deal','system','team') — 'system' matches the
  // existing convention for automation-triggered, non-contact-state-crossing
  // alerts (see LeadScoringEngine.ts's "Email Reply Detected" notification,
  // the closest precedent to this generic automation alert; 'contact' is
  // reserved there for actual contact-state events like lead-score threshold
  // crossings, not generic automation notices).
  const { message, type = "system" } = config;
  const supabase = createAdminClient();

  // Fetch contact name (+ owner, for recipient fan-out below). Missing
  // contact is not fatal here — the message already has a cosmetic
  // fallback — but a real query error is.
  const { data: contact, error: fetchError } = await supabase
   .from("contacts")
   .select("first_name, last_name, owner_id")
   .eq("id", contactId)
   .maybeSingle();

  if (fetchError) throw fetchError;

  const contactName = contact ? `${contact.first_name} ${contact.last_name}` : "A contact";
  const finalMessage = message?.replace("{contact_name}", contactName) || `Automation alert for ${contactName}`;

  // "Notify team" has no single natural recipient of its own, so this
  // previously wrote user_id: null — a row the real bell UI can never show,
  // since Notification.tsx always queries `.eq('user_id', user.id)`.
  // Fan out to the contact's owner (if any) plus workspace admins instead —
  // the same recipient set LeadScoringEngine.ts's automation alerts already
  // use, rather than inventing a new convention.
  const recipientIds = new Set<string>();
  if (contact?.owner_id) recipientIds.add(contact.owner_id);

  const { data: admins, error: adminsError } = await supabase
   .from("workspace_members")
   .select("user_id")
   .eq("workspace_id", workspaceId)
   .eq("role", "admin");

  if (adminsError) throw adminsError;
  (admins || []).forEach((a) => { if (a.user_id) recipientIds.add(a.user_id); });

  if (recipientIds.size === 0) {
   console.warn(`Automation: notify_team found no recipients (no contact owner, no workspace admins) for workspace ${workspaceId}`);
   return;
  }

  const rows = Array.from(recipientIds).map((user_id) => ({
   workspace_id: workspaceId,
   user_id,
   title: "Automation Triggered",
   message: finalMessage,
   type: type,
   link: `/contacts/${contactId}`,
  }));

  const { error } = await supabase.from("notifications").insert(rows);

  if (error) throw error;
 },

 send_webhook: async (workspaceId: string, contactId: string, config: any) => {
  const { url, method = 'POST', bodyTemplate } = config;
  if (!url) return;

  const supabase = createAdminClient();
  const { data: contact, error: fetchError } = await supabase
   .from("contacts")
   .select("*")
   .eq("id", contactId)
   .single();

  if (fetchError) throw fetchError;
  if (!contact) throw new Error(`send_webhook: contact ${contactId} not found`);

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
    const supabase = createAdminClient();
    
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
     .select("twilio_sid, twilio_token, twilio_sid_encrypted, twilio_token_encrypted, twilio_number, name")
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
    // workspaces has no whatsapp_transcript_enabled column — governed by config only.
    const sendTranscript = config.sendTranscript !== false;
    
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
    const supabase = createAdminClient();

    let stageId = config.stageId;
    if (!stageId) {
      const { data: stages, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('workspace_id', workspaceId)
        .order('position', { ascending: true })
        .limit(1);
      if (stagesError) throw stagesError;
      stageId = stages?.[0]?.id;
    }
    if (!stageId) {
      throw new Error(`create_opportunity: no pipeline stage found in workspace ${workspaceId}`);
    }

    // Missing contact is not fatal here — the title already has a cosmetic
    // fallback — but a real query error is.
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('first_name, last_name')
      .eq('id', contactId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (contactError) throw contactError;

    const { error } = await supabase.from('opportunities').insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      stage_id: stageId,
      title: config.title || `${contact?.first_name || 'Contact'} ${contact?.last_name || ''} Opportunity`.trim(),
      value: config.value ?? 0,
      status: 'open',
      position: 0,
    });
    if (error) throw error;
  },

  create_invoice: async (workspaceId: string, contactId: string, config: any) => {
    const supabase = createAdminClient();
    const amount = Number(config.amount ?? 0);
    const dueInDays = Number(config.dueInDays ?? 14);
    const dueDate = new Date(Date.now() + dueInDays * 24 * 60 * 60 * 1000).toISOString();
    const currency = config.currency || 'ZAR';

    // This is a draft, not-yet-collected amount (unlike the payment-gateway webhook paths,
    // which split an already-charged gross amount via calculateInclusiveTax), so VAT is added
    // on top of the configured amount here, same as a manually built single-line invoice.
    const { data: workspaceRow } = await supabase
      .from('workspaces')
      .select('invoice_settings')
      .eq('id', workspaceId)
      .maybeSingle();
    const vatSettings = (workspaceRow?.invoice_settings as any) || {};
    const vatRate = vatSettings.vat_enabled ? (Number(vatSettings.vat_rate) || 0) : 0;

    const items = [
      { description: config.description || 'Invoice', quantity: 1, rate: amount, taxRate: vatRate },
    ];
    const { subtotal, taxTotal, grandTotal } = calculateInvoiceTotals(items);
    const invoiceNumber = `WF-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        invoice_number: invoiceNumber,
        items,
        subtotal,
        tax_total: taxTotal,
        amount_due: grandTotal,
        total_amount: grandTotal,
        status: 'draft',
        due_date: dueDate,
        currency,
      })
      .select('id')
      .single();

    if (error) throw error;

    try {
      const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
      dispatchWebhook(workspaceId, 'invoice.created', {
        invoice: { id: invoice.id, invoice_number: invoiceNumber, amount: grandTotal, currency, status: 'draft', contact_id: contactId },
      }).catch(() => {});
    } catch (e) {
      console.error('[actions_registry] Failed to dispatch invoice.created webhook:', e);
    }
  },

  // Runs as the step after create_invoice in a workflow. There is no
  // step-output-passing mechanism in executor.ts (execution.context only ever
  // carries wait/business-hours resume state), so this cannot assume it's
  // handed the invoice created by a prior step — it looks up the contact's
  // most recent draft invoice itself, same as move_to_stage above looks up
  // the contact's most recent opportunity rather than expecting one passed in.
  send_invoice: async (workspaceId: string, contactId: string, config: any) => {
    const supabase = createAdminClient();

    const { data: contact } = await supabase
      .from('contacts')
      .select('email, first_name, last_name')
      .eq('id', contactId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!contact?.email) throw new Error('Contact has no email address');

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('contact_id', contactId)
      .eq('workspace_id', workspaceId)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invoiceError) throw invoiceError;
    if (!invoice) {
      throw new Error('No draft invoice found for this contact — send_invoice requires a preceding create_invoice step (or an existing draft invoice) before it can run.');
    }

    const result = await sendInvoiceEmail({
      workspaceId,
      invoiceId: invoice.id,
      markSent: true,
      emailSubject: config.emailSubject,
      emailBody: config.emailBody,
    });

    if (!result.success) throw new Error(result.error || 'Failed to send invoice email');
  },

  assign_salesperson: async (workspaceId: string, contactId: string, config: any) => {
    if (!config?.ownerId || typeof config.ownerId !== 'string') {
      console.warn('Automation: assign_salesperson called without a valid ownerId');
      return;
    }

    const supabase = createAdminClient();
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', config.ownerId)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) {
      throw new Error(`assign_salesperson: target ${config.ownerId} is not a member of workspace ${workspaceId}`);
    }

    const { error } = await supabase
      .from('contacts')
      .update({ owner_id: config.ownerId })
      .eq('id', contactId)
      .eq('workspace_id', workspaceId);
    if (error) throw error;
  },

  // Reuses the same "paste a webhook URL" mechanism as send_webhook — Slack Incoming
  // Webhooks are a plain POST URL, so no dedicated Slack OAuth integration is needed.
  notify_slack: async (workspaceId: string, contactId: string, config: any) => {
    if (!config?.webhookUrl) {
      console.warn('Automation: notify_slack called without a webhookUrl');
      return;
    }

    const supabase = createAdminClient();
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
    const supabase = createAdminClient();

    const { data: canSpend, error: rpcError } = await supabase.rpc('deduct_ai_credit', { p_workspace_id: workspaceId, p_amount: 1 });
    if (rpcError) throw rpcError;
    if (!canSpend) {
      // Legitimate business skip, not a failure — the workspace is out of AI credits.
      console.warn(`Automation: generate_ai_task skipped for workspace ${workspaceId} — AI credit limit reached`);
      return;
    }

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('first_name, last_name, lead_score, tags')
      .eq('id', contactId)
      .eq('workspace_id', workspaceId)
      .single();
    if (contactError) throw contactError;
    if (!contact) throw new Error(`generate_ai_task: contact ${contactId} not found in workspace ${workspaceId}`);

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

    const { error } = await supabase.from('contact_tasks').insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      title,
      status: 'todo',
    });
    if (error) throw error;
  },
};
