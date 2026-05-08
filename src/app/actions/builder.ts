'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { BUILDER_TEMPLATES } from '@/lib/builder/templates';

/**
 * --- HELPER: STANDARD ACTION WRAPPER ---
 */
async function executeAction<T>(action: (supabase: any, workspaceId: string) => Promise<T>) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { success: false, error: 'No active workspace' };
    
    const supabase = await createServerClient();
    const data = await action(supabase, workspaceId);
    return { success: true, ...data as any };
  } catch (err: any) {
    console.error('[BuilderAction Error]:', err.message);
    return { success: false, error: err.message || 'Operation failed' };
  }
}

/**
 * --- WEBSITE MANAGEMENT ---
 */

export async function getTemplates(category?: 'website' | 'funnel' | 'both') {
    if (!category) return BUILDER_TEMPLATES;
    return BUILDER_TEMPLATES.filter(t => t.category === category || t.category === 'both');
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
        // 1. Fetch original website with nested pages
        // We fetch websites -> website_pages -> pages
        const { data: original, error: fetchError } = await supabase
            .from('websites')
            .select('*, website_pages(*, pages(*))')
            .eq('id', websiteId)
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

export async function updateWebsiteSettings(websiteId: string, settings: any) {
    return executeAction(async (supabase, workspaceId) => {
        const { error } = await supabase
            .from('websites')
            .update({ 
                ...settings,
                updated_at: new Date().toISOString()
            })
            .eq('id', websiteId)
            .eq('workspace_id', workspaceId);
        
        if (error) throw error;
        revalidatePath('/websites');
        return { success: true };
    });
}

/**
 * --- PAGE MANAGEMENT ---
 */

export async function publishPage(pageId: string, content?: string) {
  try {
    const supabase = await createServerClient();
    
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
      .eq('id', pageId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('[builder] Error publishing page:', error);
    return { success: false, error: error.message };
  }
}

export async function updatePageContent(pageId: string, content: string) {
  try {
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('pages')
      .update({ 
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', pageId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('[builder] Error updating page content:', error);
    return { success: false, error: error.message };
  }
}

export async function createPage(name: string, websiteId: string) {
  try {
    const supabase = await createServerClient();
    
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
        website_page_id: wsPage.id,
        name,
        content: '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"className":"min-h-screen bg-white"},"nodes":[]}}',
        status: 'draft'
      })
      .select('id')
      .single();

    if (pageError) throw pageError;

    return { success: true, pageId: pageData.id };
  } catch (error: any) {
    console.error('[builder] Error creating page:', error);
    return { success: false, error: error.message };
  }
}

export async function updatePageSettings(pageId: string, settings: any) {
  try {
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('pages')
      .update({
        ...settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', pageId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('[builder] Error updating page settings:', error);
    return { success: false, error: error.message };
  }
}
