'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess, requireFormAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';

// FUNNELS
export async function getFunnels() {
 try {
  const supabase = await createServerClient();
  let workspaceId: string;
  try {
   ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
   return { error: 'Unauthorized' };
  }

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
  let workspaceId: string;
  try {
   ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
   return { error: 'Unauthorized' };
  }

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
    name: 'Opt-in Page',
    path_name: '/',
    order: 1
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
  let workspaceId: string;
  try {
   ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
   return { error: 'Unauthorized' };
  }

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
  let workspaceId: string;
  try {
   ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
   return { error: 'Unauthorized' };
  }

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
  let workspaceId: string;
  try {
   ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
   return { error: 'Unauthorized' };
  }

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
  try {
   await requireFormAccess(id, 'read');
  } catch (accessError: any) {
   return { error: accessError.message || 'Unauthorized' };
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
   .from('forms')
   .select('*')
   .eq('id', id)
   .single();

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'get.form.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

// Server-action wrapper so the (client-side) submissions page can go
// through requireFormAccess — the page previously queried Supabase
// directly from the browser, gated only by the viewer's own workspace_id,
// the same collaborator-blind bug as getForm above.
export async function getFormSubmissionsData(formId: string) {
 try {
  try {
   await requireFormAccess(formId, 'read');
  } catch (accessError: any) {
   return { error: accessError.message || 'Unauthorized' };
  }

  const adminSupabase = createAdminClient();
  const { data: form, error: formError } = await adminSupabase
   .from('forms')
   .select('name, config, id')
   .eq('id', formId)
   .maybeSingle();

  if (formError) throw formError;
  if (!form) return { error: 'Form not found.' };

  const { data: submissions, error: submissionsError } = await adminSupabase
   .from('form_submissions')
   .select('*, contact:contacts(first_name, last_name, email)')
   .eq('form_id', formId)
   .order('submitted_at', { ascending: false });

  if (submissionsError) throw submissionsError;

  return { data: { form, submissions: submissions || [] } };
 } catch (error: any) {
  logger.error({ err: error }, 'get.form.submissions.failed');
  return { error: 'Failed to load submissions data. Please try again.' };
 }
}

// ── /forms/[id]/automations — page load is 'read' (a viewer collaborator
// can see configured workflows); each individual write action below is
// separately gated at 'write' so a viewer can't create/toggle/delete one. ──

export async function getFormAutomationsData(formId: string) {
 try {
  try {
   await requireFormAccess(formId, 'read');
  } catch (accessError: any) {
   return { error: accessError.message || 'Unauthorized' };
  }

  const adminSupabase = createAdminClient();
  const { data: form, error: formError } = await adminSupabase
   .from('forms')
   .select('name, workspace_id')
   .eq('id', formId)
   .single();
  if (formError) throw formError;

  const { data: workflows, error: wfError } = await adminSupabase
   .from('workflows')
   .select('*, steps:workflow_steps(count)')
   .eq('form_id', formId)
   .order('created_at', { ascending: false });
  if (wfError) throw wfError;

  return { data: { form, workflows: workflows || [] } };
 } catch (error: any) {
  logger.error({ err: error }, 'get.form.automations.failed');
  return { error: 'Failed to load automations. Please try again.' };
 }
}

export async function createFormWorkflow(formId: string, name: string) {
 try {
  try {
   await requireFormAccess(formId, 'write');
  } catch (accessError: any) {
   return { error: accessError.message || 'Unauthorized' };
  }

  const adminSupabase = createAdminClient();
  const { data: form } = await adminSupabase.from('forms').select('workspace_id').eq('id', formId).single();
  if (!form) return { error: 'Form not found' };

  const { data, error } = await adminSupabase
   .from('workflows')
   .insert({
    form_id: formId,
    workspace_id: form.workspace_id,
    name,
    trigger_type: 'form_submitted',
    trigger_config: {},
    is_active: false,
   })
   .select()
   .single();
  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'create.form.workflow.failed');
  return { error: error.message || 'Failed to create new workflow' };
 }
}

export async function toggleFormWorkflowActive(formId: string, workflowId: string, isActive: boolean) {
 try {
  try {
   await requireFormAccess(formId, 'write');
  } catch (accessError: any) {
   return { error: accessError.message || 'Unauthorized' };
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from('workflows').update({ is_active: isActive }).eq('id', workflowId).eq('form_id', formId);
  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  logger.error({ err: error }, 'toggle.form.workflow.failed');
  return { error: error.message || 'Failed to update workflow status' };
 }
}

export async function deleteFormWorkflow(formId: string, workflowId: string) {
 try {
  try {
   await requireFormAccess(formId, 'write');
  } catch (accessError: any) {
   return { error: accessError.message || 'Unauthorized' };
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from('workflows').delete().eq('id', workflowId).eq('form_id', formId);
  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  logger.error({ err: error }, 'delete.form.workflow.failed');
  return { error: error.message || 'Failed to delete workflow' };
 }
}

// ── /forms/[id]/partial-submissions — page load is 'read'; the two write
// actions (generate recovery link, discard) are separately 'write'-gated. ──

export async function getPartialSubmissionsData(formId: string) {
 try {
  try {
   await requireFormAccess(formId, 'read');
  } catch (accessError: any) {
   return { error: accessError.message || 'Unauthorized' };
  }

  const adminSupabase = createAdminClient();
  const { data: form, error: formError } = await adminSupabase
   .from('forms')
   .select('name, config, id, workspace_id')
   .eq('id', formId)
   .single();
  if (formError) throw formError;

  const { data: partials, error: partialsError } = await adminSupabase
   .from('form_partial_submissions')
   .select('*')
   .eq('form_id', formId)
   .order('updated_at', { ascending: false });
  if (partialsError) throw partialsError;

  return { data: { form, partials: partials || [] } };
 } catch (error: any) {
  logger.error({ err: error }, 'get.partial.submissions.failed');
  return { error: 'Failed to load incomplete submissions. Please try again.' };
 }
}

export async function generatePartialSubmissionRecoveryLink(formId: string, partialId: string, token: string, expiresAt: string) {
 try {
  try {
   await requireFormAccess(formId, 'write');
  } catch (accessError: any) {
   return { error: accessError.message || 'Unauthorized' };
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
   .from('form_partial_submissions')
   .update({ recovery_token: token, recovery_token_expires_at: expiresAt })
   .eq('id', partialId)
   .eq('form_id', formId);
  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  logger.error({ err: error }, 'generate.partial.recovery.link.failed');
  return { error: 'Failed to generate recovery link' };
 }
}

export async function deletePartialSubmission(formId: string, partialId: string) {
 try {
  try {
   await requireFormAccess(formId, 'write');
  } catch (accessError: any) {
   return { error: accessError.message || 'Unauthorized' };
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from('form_partial_submissions').delete().eq('id', partialId).eq('form_id', formId);
  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  logger.error({ err: error }, 'delete.partial.submission.failed');
  return { error: 'Failed to delete incomplete submission' };
 }
}

// ── /forms/[id]/analytics and /forms/[id]/ab-testing — pure read
// surfaces, no write operations exist on either page today. ──

export async function getFormAnalyticsAccessData(formId: string) {
 try {
  try {
   await requireFormAccess(formId, 'read');
  } catch (accessError: any) {
   return { error: accessError.message || 'Unauthorized' };
  }
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase.from('forms').select('name, id').eq('id', formId).single();
  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'get.form.analytics.access.failed');
  return { error: 'Failed to load form. Please try again.' };
 }
}

export async function getFormAbTestingAccessData(formId: string) {
 try {
  try {
   await requireFormAccess(formId, 'read');
  } catch (accessError: any) {
   return { error: accessError.message || 'Unauthorized' };
  }
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase.from('forms').select('name, id').eq('id', formId).single();
  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'get.form.abtesting.access.failed');
  return { error: 'Failed to load form. Please try again.' };
 }
}

// ── /forms/[id]/governance — owner/workspace-member only. Collaborators
// (any role) never qualify — collaborator management itself is owner-only
// per the confirmed role mapping. ──

export async function getFormForGovernance(formId: string) {
 try {
  try {
   await requireFormAccess(formId, 'manage');
  } catch (accessError: any) {
   return { error: accessError.message || 'Unauthorized' };
  }
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase.from('forms').select('*').eq('id', formId).single();
  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'get.form.governance.failed');
  return { error: 'Failed to load form. Please try again.' };
 }
}

export async function createForm(name: string) {
 try {
  const supabase = await createServerClient();
  let workspaceId: string;
  try {
   ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
   return { error: 'Unauthorized' };
  }

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
  let workspaceId: string;
  try {
   ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
   return { error: 'Unauthorized' };
  }

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
  let workspaceId: string;
  try {
   ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
   return { error: 'Unauthorized' };
  }

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
  let workspaceId: string;
  try {
   ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
   return { error: 'Unauthorized' };
  }
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
  let workspaceId: string;
  try {
   ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
   return { error: 'Unauthorized' };
  }
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
  let workspaceId: string;
  try {
   ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
   return { error: 'Unauthorized' };
  }

  // If moving status to sent or scheduled, enforce Domain Verification rules
  if (updates.status === 'sent' || updates.status === 'scheduled') {
   // Scoped to the caller's own verified workspace — previously this looked
   // up the campaign by id alone with no workspace filter, then overwrote
   // workspaceId with whatever workspace_id that row happened to have. That
   // made the update below's .eq("workspace_id", workspaceId) check
   // self-referential (always scoped to the target row's own workspace,
   // never the caller's), letting any authenticated user update any other
   // workspace's campaign by id. Scoping this lookup to the real caller
   // workspace closes that: a cross-workspace id now correctly finds
   // nothing and falls into the "not found" branch below instead of
   // silently succeeding against someone else's data.
   const { data: campaign, error: campaignError } = await supabase
    .from('email_campaigns')
    .select('from_email, workspace_id')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single();

   if (campaignError || !campaign) {
    throw new Error('Email campaign not found.');
   }

  let fromEmail = updates.from_email || campaign.from_email;

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
  
  // Recipient count shown to the user — derived from the exact same
  // contact-id set that gets queued below, not a separately-computed count,
  // so the number displayed always matches what was actually enqueued.
  let matchedContactsCount = 0;
  if (updates.status === 'scheduled') {
   const segmentTags: string[] = Array.isArray(updates.segment?.tags) ? updates.segment.tags : [];
   const ruleGroup = updates.segment?.ruleGroup && Array.isArray(updates.segment.ruleGroup.rules) && updates.segment.ruleGroup.rules.length > 0
    ? updates.segment.ruleGroup
    : null;
   const combineMode: 'AND' | 'OR' = updates.segment?.combineMode === 'OR' ? 'OR' : 'AND';

   if ((segmentTags.length > 0 || ruleGroup) && data.workspace_id) {
    let matchError: any = null;

    // Tag-based match — unchanged from before (real relational membership
    // via tag_assignments for uuid ids, legacy contacts.tags array match
    // for pre-Smart-Tags campaigns storing plain names).
    let tagMatchedIds: Set<string> | null = null;
    if (segmentTags.length > 0) {
     tagMatchedIds = new Set<string>();
     const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
     const tagIds = segmentTags.filter(isUuid);
     const legacyTagNames = segmentTags.filter((v) => !isUuid(v));

     if (tagIds.length > 0) {
      // Real, current relational membership — every contact presently carrying
      // ALL of these tag ids per tag_assignments (Part 1's source of truth),
      // not a stale free-text array snapshot.
      const { data: assignments, error: assignErr } = await supabase
       .from('tag_assignments')
       .select('entity_id, tag_id')
       .eq('workspace_id', data.workspace_id)
       .eq('entity_type', 'contact')
       .in('tag_id', tagIds);

      if (assignErr) {
       matchError = assignErr;
      } else {
       const countsByContact = new Map<string, number>();
       (assignments ?? []).forEach((a) => countsByContact.set(a.entity_id, (countsByContact.get(a.entity_id) ?? 0) + 1));
       Array.from(countsByContact.entries())
        .filter(([, count]) => count === tagIds.length)
        .forEach(([contactId]) => tagMatchedIds!.add(contactId));
      }
     }

     if (!matchError && legacyTagNames.length > 0) {
      const { data: legacyMatches, error: legacyErr } = await supabase
       .from('contacts')
       .select('id')
       .eq('workspace_id', data.workspace_id)
       .contains('tags', legacyTagNames);

      if (legacyErr) {
       matchError = legacyErr;
      } else {
       (legacyMatches ?? []).forEach((c) => tagMatchedIds!.add(c.id));
      }
     }
    }

    // Rule-group match — new. SegmentationCompiler.executeSegment() already
    // has its own DB-RPC-then-JS-fallback resilience, so no extra error
    // handling is needed here beyond catching a hard throw.
    let ruleGroupMatchedIds: Set<string> | null = null;
    if (!matchError && ruleGroup) {
     try {
      const { SegmentationCompiler } = await import('@/lib/intelligence/SegmentationCompiler');
      const ruleMatches = await SegmentationCompiler.executeSegment(data.workspace_id, ruleGroup);
      ruleGroupMatchedIds = new Set(ruleMatches.map((c: any) => c.id));
     } catch (ruleErr) {
      matchError = ruleErr;
     }
    }

    // Combine per combineMode. Only one of the two sets present -> use it
    // alone unchanged (this is what keeps existing tag-only campaigns
    // resolving identically to before this change).
    let matchedContactIds: Set<string>;
    if (tagMatchedIds && ruleGroupMatchedIds) {
     matchedContactIds = combineMode === 'OR'
      ? new Set([...tagMatchedIds, ...ruleGroupMatchedIds])
      : new Set([...tagMatchedIds].filter((cid) => ruleGroupMatchedIds!.has(cid)));
    } else {
     matchedContactIds = tagMatchedIds || ruleGroupMatchedIds || new Set<string>();
    }

    if (matchError) {
     logger.error({ err: matchError, campaignId: id }, 'update.campaign.tag_match.failed');
    } else if (matchedContactIds.size > 0) {
     // Dedupe defensively — a contact must only ever get one queue row per
     // campaign even if future matching logic can return the same contact
     // via more than one path.
     const uniqueContactIds = Array.from(matchedContactIds);

     const queueRows = uniqueContactIds.map(contactId => ({
      campaign_id: id,
      workspace_id: data.workspace_id,
      contact_id: contactId,
      status: 'pending',
     }));

     // upsert + ignoreDuplicates -> ON CONFLICT (campaign_id, contact_id) DO NOTHING.
     // Redeploying an already-deployed campaign must be a safe no-op, not a
     // duplicate queue row that would get sent twice.
     const { error: queueError } = await supabase
      .from('campaign_dispatch_queue')
      .upsert(queueRows, { onConflict: 'campaign_id,contact_id', ignoreDuplicates: true });
     if (queueError) {
      logger.error({ err: queueError, campaignId: id }, 'update.campaign.dispatch_queue.insert.failed');
      throw new Error('Failed to queue campaign recipients. Please try again.');
     }

     matchedContactsCount = uniqueContactIds.length;
    }
   }

   // If specific emails were provided, instantly dispatch to them! This path
   // never goes through the dispatch worker, so it must do its own
   // per-recipient personalization here — updates.body_html is stored with
   // {{tokens}} intact (see EmailBuilderClient's skipPersonalization).
   if (updates.segment?.emails?.length > 0 && updates.body_html) {
    const { sendEmail } = await import('@/lib/email');
    const { parsePersonalTokens } = await import('@/lib/builder/emailRenderer');
    const { buildUnsubscribeLink } = await import('@/lib/email/unsubscribeLink');

    // Direct-list addresses aren't necessarily existing CRM contacts — look
    // up whichever ones are, for real first_name/last_name/company; the rest
    // fall back to parsePersonalTokens's own generic defaults.
    const { data: matchingContacts } = await supabase
     .from('contacts')
     .select('email, first_name, last_name, company')
     .eq('workspace_id', workspaceId)
     .in('email', updates.segment.emails);
    const contactsByEmail = new Map((matchingContacts || []).map((c: any) => [c.email.toLowerCase(), c]));

    for (const email of updates.segment.emails) {
     const contact = contactsByEmail.get(email.toLowerCase());
     const personalizedHtml = parsePersonalTokens(updates.body_html, contact, {
      unsubscribe_link: buildUnsubscribeLink(email, workspaceId)
     });

     await sendEmail({
      to: email,
      subject: updates.subject || data.subject || 'LeadsMind Campaign',
      html: personalizedHtml,
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
  let workspaceId: string;
  try {
   ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
   return { error: 'Unauthorized' };
  }
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
  try {
   await requireFormAccess(id, 'write');
  } catch (accessError: any) {
   return { error: accessError.message || 'Unauthorized' };
  }

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

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
   .from('forms')
   .update(payload)
    .eq("id", id)
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
  try {
   await requireFormAccess(id, 'manage');
  } catch (accessError: any) {
   return { error: accessError.message || 'Unauthorized' };
  }
  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from('forms').delete().eq("id", id);
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
  let workspaceId: string;
  try {
   ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
   return { error: 'Unauthorized' };
  }

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
   .order('order', { ascending: true });

  if (steps) {
   for (const step of steps) {
    // Insert cloned step
    const { data: newStep, error: stepErr } = await supabase
     .from('funnel_steps')
     .insert({
      funnel_id: duplicate.id,
      name: step.name,
      path_name: step.path_name,
      order: step.order
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
  let workspaceId: string;
  try {
   ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
   return { error: 'Unauthorized' };
  }

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
  let workspaceId: string;
  try {
   ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
   return { error: 'Unauthorized' };
  }

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
