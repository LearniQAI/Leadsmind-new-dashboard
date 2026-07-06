'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { logger } from '@/shared/logger';

// FUNNELS
export async function getFunnels() {
 try {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const { data, error } = await supabase
   .from('funnels')
   .select('*')
   .eq('workspace_id', workspaceId)
   .order('created_at', { ascending: false });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'get.funnels.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function createFunnel(name: string) {
 try {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  // 1. Create Funnel record
  const { data, error } = await supabase
   .from('funnels')
   .insert({
    workspace_id: workspaceId,
    name,
    subdomain: name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(Math.random() * 1000),
    is_published: false
   })
   .select()
   .single();

  if (error) throw error;

  // 2. Create Initial Funnel Step
  const { data: step, error: stepError } = await supabase
   .from('funnel_steps')
   .insert({
    funnel_id: data.id,
    workspace_id: workspaceId,
    name: 'Opt-in Page',
    path: '/',
    position: 1
   })
   .select()
   .single();

  if (stepError) throw stepError;

  // 3. Create initial CraftJS page content linked to funnel step
  const initialContent = '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"className":"min-h-screen bg-white"},"nodes":[]}}';
  const { error: pageError } = await supabase
   .from('pages')
   .insert({
    workspace_id: workspaceId,
    funnel_step_id: step.id,
    name: 'Opt-in Page',
    content: initialContent,
    status: 'draft'
   });

  if (pageError) throw pageError;

  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'create.funnel.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

// CAMPAIGNS
export async function getEmailCampaigns() {
 try {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const { data, error } = await supabase
   .from('email_campaigns')
   .select('*, template:email_templates(name)')
   .eq('workspace_id', workspaceId)
   .order('created_at', { ascending: false });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'get.email.campaigns.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function createEmailCampaign(name: string) {
 try {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const { data, error } = await supabase
   .from('email_campaigns')
   .insert({
    workspace_id: workspaceId,
    name,
    subject: `New Campaign: ${name}`,
    status: 'draft'
   })
   .select()
   .single();

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'create.email.campaign.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

// FORMS
export async function getForms() {
 try {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const { data, error } = await supabase
   .from('forms')
   .select('*, submissions:form_submissions(count)')
   .eq('workspace_id', workspaceId)
   .order('created_at', { ascending: false });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'get.forms.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function getForm(id: string) {
 try {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const { data, error } = await supabase
   .from('forms')
   .select('*')
   .eq('id', id)
   .eq('workspace_id', workspaceId)
   .single();

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'get.form.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function createForm(name: string) {
 try {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const { data, error } = await supabase
   .from('forms')
   .insert({
    workspace_id: workspaceId,
    name,
    fields: [],
    config: {},
    status: 'draft',
   })
   .select()
   .single();

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'create.form.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

// REVIEWS / REPUTATION
export async function getReviews() {
 try {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const { data, error } = await supabase
   .from('reputation_reviews')
   .select('*')
   .eq('workspace_id', workspaceId)
   .order('created_at', { ascending: false });

  if (error) throw error;
  
  const mapped = data?.map((r: any) => ({
    id: r.id,
    reviewer_name: r.reviewer_name,
    rating: r.rating,
    body: r.review_text,
    platform: r.platform,
    reply_text: r.reply_text,
    replied: r.replied,
    review_date: r.published_at || r.created_at
  })) || [];

  return { data: mapped };
 } catch (error: any) {
  logger.error({ err: error }, 'get.reviews.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

// ADS
export async function getAdCampaigns() {
 try {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const { data, error } = await supabase
   .from('ad_campaigns')
   .select('*')
   .eq('workspace_id', workspaceId)
   .order('created_at', { ascending: false });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'get.ad.campaigns.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

// --- CRUD EXTENSIONS ---

export async function updateFunnel(id: string, updates: any) {
 try {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();
  const { data, error } = await supabase.from('funnels').update(updates).eq("id", id).eq("workspace_id", workspaceId).select().single();
  if (error) throw error;
  return { data };
 } catch (error: any) {
   logger.error({ err: error }, 'update.funnel.failed');
   return { error: 'Operation failed. Please try again.' };
 }
}

export async function deleteFunnelAction(id: string) {
 try {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();
  const { error } = await supabase.from('funnels').delete().eq("id", id).eq("workspace_id", workspaceId);
  if (error) throw error;
  return { success: true };
 } catch (error: any) {
   logger.error({ err: error }, 'delete.funnel.action.failed');
   return { error: 'Operation failed. Please try again.' };
 }
}

export async function updateCampaign(id: string, updates: any) {
 try {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  let workspaceId = await getCurrentWorkspaceId();
  // If moving status to sent or scheduled, enforce Domain Verification rules
  if (updates.status === 'sent' || updates.status === 'scheduled') {
   const { data: campaign, error: campaignError } = await supabase
    .from('email_campaigns')
    .select('from_email, workspace_id')
    .eq('id', id)
    .single();

   if (campaignError || !campaign) {
    throw new Error('Email campaign not found.');
   }

  let fromEmail = updates.from_email || campaign.from_email;
  workspaceId = campaign.workspace_id;
   
   // Default to Leadsmind address if not set
   if (!fromEmail) {
    fromEmail = 'hello@leadsmind.io';
    updates.from_email = fromEmail;
   }

   const emailParts = fromEmail.split('@');
   if (emailParts.length < 2) {
    throw new Error('Invalid "From Email" address format.');
   }
   const domainName = emailParts[1].toLowerCase().trim();

   // Skip checks for the sandbox domain if desired, but throw warning otherwise
   const isDefaultSandbox = domainName === 'resend.dev' || domainName === 'leadsmind.io';

   if (!isDefaultSandbox) {
    const { data: domainRecord, error: domainError } = await supabase
     .from('sender_domains')
     .select('spf_status, dkim_status')
     .eq('workspace_id', workspaceId)
     .eq('domain_name', domainName)
     .single();

    if (domainError || !domainRecord) {
     throw new Error(`Hard Block: Domain '${domainName}' is not registered. Please register and authenticate this domain in Settings > Domains first.`);
    }

    if (!domainRecord.spf_status || !domainRecord.dkim_status) {
     throw new Error(`Hard Block: Domain '${domainName}' has unverified SPF/DKIM records. You must complete verification in Settings > Domains before scheduling or sending campaigns.`);
    }
   }
  }

  const { data, error } = await supabase.from('email_campaigns').update(updates).eq("id", id).eq("workspace_id", workspaceId).select().single();
  if (error) throw error;
  
  // Count matching contacts for the user's peace of mind
  let matchedContactsCount = 0;
  if (updates.status === 'scheduled') {
   if (updates.segment?.tags?.length > 0 && data.workspace_id) {
    const { count, error: countError } = await supabase
     .from('contacts')
     .select('id', { count: 'exact', head: true })
     .eq('workspace_id', data.workspace_id)
     .contains('tags', updates.segment.tags);
    if (!countError) matchedContactsCount = count || 0;
   }

   // If specific emails were provided, instantly dispatch to them!
   if (updates.segment?.emails?.length > 0 && updates.body_html) {
    const { sendEmail } = await import('@/lib/email');
    for (const email of updates.segment.emails) {
     await sendEmail({
      to: email,
      subject: updates.subject || data.subject || 'LeadsMind Campaign',
      html: updates.body_html,
      config: {
       fromEmail: updates.from_email || data.from_email || 'hello@leadsmind.io',
       fromName: data.from_name || 'LeadsMind'
      }
     });
    }
   }
  }

  return { data, matchedContactsCount };
 } catch (error: any) {
   logger.error({ err: error }, 'update.campaign.failed');
   return { error: 'Operation failed. Please try again.' };
 }
}

export async function deleteCampaignAction(id: string) {
 try {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();
  const { error } = await supabase.from('email_campaigns').delete().eq("id", id).eq("workspace_id", workspaceId);
  if (error) throw error;
  return { success: true };
 } catch (error: any) {
   logger.error({ err: error }, 'delete.campaign.action.failed');
   return { error: 'Operation failed. Please try again.' };
 }
}

export async function updateForm(id: string, updates: any) {
 try {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();

  // Build a clean update payload — only include columns that exist in the schema
  const payload: Record<string, any> = { updated_at: new Date().toISOString() };

  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.fields !== undefined) {
    if (Array.isArray(updates.fields)) {
      for (const field of updates.fields) {
        if (field.type === 'checkbox') {
          if (
            field.defaultValue === true ||
            field.checked === true ||
            field.defaultChecked === true ||
            field.preChecked === true ||
            field.value === true
          ) {
            throw new Error(`POPIA Compliance Error: Checkbox "${field.label}" cannot be pre-checked by default.`);
          }
        }
      }
    }
    payload.fields = updates.fields;
  }
  if (updates.config !== undefined) payload.config = updates.config;
  if (updates.settings !== undefined) payload.settings = updates.settings;

  const { data, error } = await supabase
   .from('forms')
   .update(payload)
    .eq("id", id).eq("workspace_id", workspaceId)
   .select()
   .single();

  if (error) throw error;
  return { data };
 } catch (error: any) {
   logger.error({ err: error }, 'update.form.failed');
   return { error: 'Operation failed. Please try again.' };
 }
}

export async function deleteFormAction(id: string) {
 try {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();
  const { error } = await supabase.from('forms').delete().eq("id", id).eq("workspace_id", workspaceId);
  if (error) throw error;
  return { success: true };
 } catch (error: any) {
   logger.error({ err: error }, 'delete.form.action.failed');
   return { error: 'Operation failed. Please try again.' };
 }
}

export async function duplicateFunnelAction(id: string) {
 try {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  // 1. Fetch original funnel
  const { data: original, error: fetchError } = await supabase
   .from('funnels')
   .select('*')
   .eq('id', id)
   .eq('workspace_id', workspaceId)
   .single();

  if (fetchError) throw fetchError;

  // 2. Insert new funnel
  const { data: duplicate, error: createError } = await supabase
   .from('funnels')
   .insert({
    workspace_id: workspaceId,
    name: `${original.name} (Clone)`,
    subdomain: `${original.subdomain || 'funnel'}-clone-${Math.floor(Math.random() * 10000)}`,
    is_published: false,
    config: original.config
   })
   .select()
   .single();

  if (createError) throw createError;

  // 3. Fetch steps and pages
  const { data: steps } = await supabase
   .from('funnel_steps')
   .select('*, pages(*)')
   .eq('funnel_id', id)
   .order('position', { ascending: true });

  if (steps) {
   for (const step of steps) {
    // Insert cloned step
    const { data: newStep, error: stepErr } = await supabase
     .from('funnel_steps')
     .insert({
      funnel_id: duplicate.id,
      name: step.name,
      path: step.path,
      workspace_id: workspaceId,
					position: step.position
     })
     .select()
     .single();

    if (!stepErr && step.pages && step.pages.length > 0) {
     for (const p of step.pages) {
      await supabase.from('pages').insert({
       workspace_id: workspaceId,
       funnel_step_id: newStep.id,
       name: p.name,
       content: p.content,
       status: 'draft'
      });
     }
    }
   }
  }

  return { data: duplicate };
 } catch (error: any) {
   logger.error({ err: error }, 'duplicate.funnel.action.failed');
   return { error: 'Operation failed. Please try again.' };
 }
}

export async function getWorkspaceApiKey() {
 try {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const { data, error } = await supabase
   .from('workspaces')
   .select('api_key')
   .eq('id', workspaceId)
   .single();

  if (error) throw error;
  return { apiKey: data.api_key };
 } catch (error: any) {
  logger.error({ err: error }, 'get.workspace.api.key.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function sendTestEmailAction(campaignId: string, testEmail: string, compiledHtml: string) {
 try {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const { data: campaign, error } = await supabase
   .from('email_campaigns')
   .select('subject, from_name, from_email')
   .eq('id', campaignId)
   .eq('workspace_id', workspaceId)
   .single();

  if (error || !campaign) throw new Error('Campaign not found');

  const { sendEmail } = await import('@/lib/email');
  
  await sendEmail({
   to: testEmail,
   subject: `[TEST] ${campaign.subject || 'Test Campaign'}`,
   html: compiledHtml,
   config: {
    fromEmail: campaign.from_email || 'hello@leadsmind.io',
    fromName: campaign.from_name || 'LeadsMind Test'
   }
  });

  return { success: true };
 } catch (error: any) {
  logger.error({ err: error }, 'send.test.email.action.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}
