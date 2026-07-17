'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { BUILDER_TEMPLATES } from '@/lib/builder/templates';
import { logger } from '@/shared/logger';
import { toClientError } from '@/shared/errors/AppError';

/**
 * --- HELPER: STANDARD ACTION WRAPPER ---
 * Previously imported requireAuth but never called it — copy-paste drift
 * from its siblings builderAI.ts/builderDeploy.ts, which both correctly
 * check auth in this exact wrapper shape. This was the single missing call
 * responsible for all of this file's DB-touching functions landing in the
 * triage's Critical tier instead of Weak like those siblings. Matches
 * builderDeploy.ts's wrapper exactly: verifies a real session
 * (authentication) before running the action. This does NOT verify the
 * caller is a member of the workspaceId read from the cookie
 * (authorization) — that's the same Weak-tier gap builderAI.ts/builderDeploy.ts
 * already have today, tracked separately per function in security-remediation.md,
 * not silently closed by this fix.
 */
async function executeAction<T>(action: (supabase: any, workspaceId: string) => Promise<T>) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Unauthorized' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { success: false, error: 'No active workspace' };

    const data = await action(supabase, workspaceId);
    return { success: true, ...data as any };
  } catch (err: any) {
    logger.error({ err }, 'builder.action.failed');
    const clientError = toClientError(err);
    return { success: false, error: clientError.error };
  }
}

/**
 * --- WEBSITE MANAGEMENT ---
 */

export async function getTemplates(type?: 'website' | 'funnel' | 'both') {
    if (!type) return BUILDER_TEMPLATES;
    return BUILDER_TEMPLATES.filter(t => t.type === type || t.type === 'both');
}

export async function createWebsite(name: string, subdomain: string, templateId?: string) {
  return executeAction(async (supabase, workspaceId) => {
    // 1. Create the website record
    const { data: website, error: wsError } = await supabase
      .from('websites')
      .insert({
        workspace_id: workspaceId,
        name,
        subdomain,
        is_published: false
      })
      .select()
      .single();

    if (wsError) throw wsError;

    // 2. Create the Home website_page (the routing record)
    const { data: wsPage, error: wsPageError } = await supabase
      .from('website_pages')
      .insert({
        website_id: website.id,
        name: 'Home',
        path_name: '/'
      })
      .select()
      .single();

    if (wsPageError) throw wsPageError;

    // 3. Determine initial content
    let content = '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"className":"min-h-screen bg-white"},"nodes":[]}}';
    if (templateId) {
        const template = BUILDER_TEMPLATES.find(t => t.id === templateId);
        if (template) content = template.content;
    }

    // 4. Create the actual page content record linked to the website_page
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .insert({
        workspace_id: workspaceId,
        website_page_id: wsPage.id, // Linked here
        name: 'Home',
        content,
        status: 'draft'
      })
      .select()
      .single();

    if (pageError) throw pageError;

    revalidatePath('/websites');
    return { websiteId: website.id, pageId: page.id };
  });
}

export async function duplicateWebsite(websiteId: string) {
  return executeAction(async (supabase, workspaceId) => {
    // 1. Fetch original website with nested pages — scoped to the verified
    // workspace so an authenticated caller can't duplicate another
    // workspace's site by supplying its raw id (the auth fix alone doesn't
    // cover this; it was flagged separately in the triage and needs its own
    // ownership check on the read).
    const { data: original, error: fetchError } = await supabase
      .from('websites')
      .select('*, website_pages(*, pages(*))')
      .eq('id', websiteId)
      .eq('workspace_id', workspaceId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Create new website
    const { data: duplicate, error: createError } = await supabase
      .from('websites')
      .insert({
        workspace_id: workspaceId,
        name: `${original.name} (Copy)`,
        subdomain: `${original.subdomain}-copy-${Date.now().toString(36)}`,
        config: original.config,
        is_published: false
      })
      .select()
      .single();
    
    if (createError) throw createError;

    // 3. Duplicate pages
    for (const wp of (original.website_pages || [])) {
      // Duplicate the website_page record
      const { data: newWsPage, error: wsPageError } = await supabase
        .from('website_pages')
        .insert({
          website_id: duplicate.id,
          name: wp.name,
          path_name: wp.path_name
        })
        .select()
        .single();
      
      if (wsPageError) throw wsPageError;

      // Duplicate the content page record(s)
      const originalPages = wp.pages || [];
      for (const p of originalPages) {
        await supabase
          .from('pages')
          .insert({
            workspace_id: workspaceId,
            website_page_id: newWsPage.id,
            name: p.name,
            content: p.content,
            status: 'draft'
          });
      }
    }

    revalidatePath('/websites');
    return { success: true };
  });
}

export async function deleteWebsite(websiteId: string) {
  return executeAction(async (supabase, workspaceId) => {
    const { error } = await supabase
      .from('websites')
      .delete()
      .eq('id', websiteId)
      .eq('workspace_id', workspaceId);
    
    if (error) throw error;
    revalidatePath('/websites');
    return { success: true };
  });
}

export async function updateWebsiteSettings(websiteId: string, type: 'website' | 'funnel', settings: any) {
  return executeAction(async (supabase, workspaceId) => {
    const table = type === 'funnel' ? 'funnels' : 'websites';
    const { error } = await supabase
      .from(table)
      .update({ 
        ...settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', websiteId)
      .eq('workspace_id', workspaceId);
    
    if (error) throw error;
    revalidatePath(`/${table}`);
    return { success: true };
  });
}

/**
 * --- PAGE MANAGEMENT ---
 */

export async function publishPage(pageId: string, content?: string) {
  return executeAction(async (supabase, workspaceId) => {
    const updateData: any = { 
      status: 'published',
      published_at: new Date().toISOString()
    };

    if (content) {
      updateData.content = content;
    }

    const { error } = await supabase
      .from('pages')
      .update(updateData)
      .eq('id', pageId)
      .eq('workspace_id', workspaceId); // Add workspace_id check for security

    if (error) throw error;

    return { success: true };
  });
}

export async function updatePageContent(pageId: string, content: string) {
  return executeAction(async (supabase, workspaceId) => {
    const { error } = await supabase
      .from('pages')
      .update({ 
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', pageId)
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    return { success: true };
  });
}

export async function createPage(name: string, websiteId: string) {
  return executeAction(async (supabase, workspaceId) => {
    // website_pages has no workspace_id column of its own (scoped only via
    // website_id -> websites.workspace_id), so the auth fix alone doesn't
    // stop a caller from attaching a new page to another workspace's site
    // by supplying its raw id — verify ownership first, as flagged
    // separately in the triage.
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id')
      .eq('id', websiteId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (websiteError) throw websiteError;
    if (!website) throw new Error('Website not found');

    // 1. Create the routing record
    const { data: wsPage, error: wsPageError } = await supabase
      .from('website_pages')
      .insert({
        website_id: websiteId,
        name,
        path_name: `/${name.toLowerCase().replace(/\s+/g, '-')}`
      })
      .select()
      .single();

    if (wsPageError) throw wsPageError;

    // 2. Create the content record
    const { data: pageData, error: pageError } = await supabase
      .from('pages')
      .insert({
        workspace_id: workspaceId,
        website_page_id: wsPage.id,
        name,
        content: '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"className":"min-h-screen bg-white"},"nodes":[]}}',
        status: 'draft'
      })
      .select('id')
      .single();

    if (pageError) throw pageError;

    return { pageId: pageData.id };
  });
}

export async function updatePageSettings(pageId: string, settings: any) {
  return executeAction(async (supabase, workspaceId) => {
    const { error } = await supabase
      .from('pages')
      .update({
        ...settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', pageId)
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    return { success: true };
  });
}

/**
 * --- LEAD & FORM PROCESSING ---
 */

// Public submission surfaces (widget embeds, the /api/builder/submit route) only
// know a pageId — the workspaceId they send alongside it is unauthenticated
// client input and must never be trusted. This resolves the real workspace_id
// from the pages row itself, the same "derive from a trusted row" pattern used
// by studentEnrollments.ts, so a caller can't inject data into a workspace it
// doesn't actually own by guessing/forging a workspaceId.
export async function resolvePageWorkspaceId(pageId: string): Promise<string | null> {
  if (!pageId) return null;
  // Admin client: this is called from a fully public, unauthenticated context
  // (anonymous website visitors have no session/RLS visibility), and the only
  // thing this reads is the trusted workspace_id owner of a page id — nothing
  // caller-controlled influences the result.
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('pages')
    .select('workspace_id')
    .eq('id', pageId)
    .maybeSingle();
  return data?.workspace_id ?? null;
}

export async function handlePageFormSubmission(pageId: string, _workspaceId: string, payload: any) {
  let workspaceId: string | null = null;
  try {
    // The workspaceId param is caller-supplied and untrusted (this action is
    // reachable from a fully public, unauthenticated route). Always derive the
    // real workspace from the pageId's own row instead.
    workspaceId = await resolvePageWorkspaceId(pageId);
    if (!workspaceId) {
      return { success: false, error: 'Invalid page' };
    }

    // Admin client for the same reason as resolvePageWorkspaceId above: an
    // anonymous visitor has no RLS-visible session, and every write below is
    // now scoped to the workspaceId we just verified server-side (never the
    // raw client input), so bypassing RLS here doesn't reopen the IDOR — it's
    // the same pattern the "Public form submissions" RLS policy backstops
    // for anyone bypassing this action and hitting PostgREST directly.
    const supabase = createAdminClient();

    // 1. Identify primary contact info
    const email = payload.email || payload.Email;
    const firstName = payload.first_name || payload.FirstName || payload.Name?.split(' ')[0] || '';
    const lastName = payload.last_name || payload.LastName || payload.Name?.split(' ').slice(1).join(' ') || '';
    const phone = payload.phone || payload.Phone || '';

    // 2. Create or Update Contact
    let contactId = null;
    if (email) {
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('email', email)
        .single();
      
      if (existingContact) {
        contactId = existingContact.id;
        // Optionally update contact
        await supabase.from('contacts').update({
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          phone: phone || undefined,
          updated_at: new Date().toISOString()
        }).eq("id", contactId).eq("workspace_id", workspaceId);
          
      } else {
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            workspace_id: workspaceId,
            email,
            first_name: firstName,
            last_name: lastName,
            phone,
            source: 'Website Form'
          })
          .select('id')
          .single();
        
        if (contactError) throw contactError;
        contactId = newContact.id;
      }
    }

    // 3. Log Activity
    if (contactId) {
      await supabase.from('contact_activities').insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        type: 'edit',
        description: `Submitted form on page: ${pageId}`,
        metadata: { ...payload, page_id: pageId, type: 'form_submission' }
      });

      // Trigger automation event
      const { publishEvent } = await import('@/lib/events/EventBus');
      await publishEvent(workspaceId, 'funnel_subscribed', contactId, { pageId, payload });
    }

    return { success: true, workspaceId };
  } catch (error: any) {
    logger.error({ err: error, workspaceId, pageId }, 'builder.form_submission.failed');
    const clientError = toClientError(error);
    return { success: false, error: clientError.error };
  }
}

/**
 * --- WORKSPACE BUILDER SETTINGS ---
 */
export async function getWorkspaceBuilderSettings() {
  return executeAction(async (supabase, workspaceId) => {
    const { data, error } = await supabase
      .from('workspace_builder_settings')
      .select('settings')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error) throw error;
    return { settings: data?.settings || {} };
  });
}

export async function updateWorkspaceBuilderSettings(settings: any) {
  return executeAction(async (supabase, workspaceId) => {
    const { data: existing } = await supabase
      .from('workspace_builder_settings')
      .select('id')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('workspace_builder_settings')
        .update({
          settings,
          updated_at: new Date().toISOString()
        })
        .eq('workspace_id', workspaceId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('workspace_builder_settings')
        .insert({
          workspace_id: workspaceId,
          settings
        });
      if (error) throw error;
    }

    return { success: true };
  });
}

/**
 * --- CUSTOM COMPONENT BLUEPRINTS ---
 */
export async function saveCustomComponent(name: string, description: string, content: any) {
  return executeAction(async (supabase, workspaceId) => {
    const { data, error } = await supabase
      .from('custom_builder_components')
      .insert({
        workspace_id: workspaceId,
        name,
        description,
        content
      })
      .select()
      .single();

    if (error) throw error;
    return { component: data };
  });
}

export async function getCustomComponents() {
  return executeAction(async (supabase, workspaceId) => {
    const { data, error } = await supabase
      .from('custom_builder_components')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { components: data || [] };
  });
}

export async function deleteCustomComponent(id: string) {
  return executeAction(async (supabase, workspaceId) => {
    const { error } = await supabase
      .from('custom_builder_components')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return { success: true };
  });
}

/**
 * --- BUILDER MEDIA ASSETS ---
 */
export async function saveMediaAsset(url: string, filename: string, sizeBytes: number, mimeType: string, label?: string) {
  return executeAction(async (supabase, workspaceId) => {
    const { data, error } = await supabase
      .from('builder_media_assets')
      .insert({
        workspace_id: workspaceId,
        url,
        filename,
        size_bytes: sizeBytes,
        mime_type: mimeType,
        label
      })
      .select()
      .single();

    if (error) throw error;
    return { asset: data };
  });
}

export async function getMediaAssets() {
  return executeAction(async (supabase, workspaceId) => {
    const { data, error } = await supabase
      .from('builder_media_assets')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { assets: data || [] };
  });
}

export async function deleteMediaAsset(id: string) {
  return executeAction(async (supabase, workspaceId) => {
    const { error } = await supabase
      .from('builder_media_assets')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return { success: true };
  });
}

