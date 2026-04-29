'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Publishes a page by updating its status and syncing content if needed.
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

    revalidatePath(`/pages/${pageId}`);
    return { success: true };
  } catch (error: any) {
    console.error('[builder] Error publishing page:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Updates the content of a page.
 */
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

/**
 * Updates global website/funnel settings.
 */
export async function updateWebsiteSettings(websiteId: string, type: 'website' | 'funnel', config: any) {
  try {
    const supabase = await createServerClient();
    const table = type === 'website' ? 'websites' : 'funnels';
    
    const { error } = await supabase
      .from(table)
      .update({ 
        config,
        updated_at: new Date().toISOString()
      })
      .eq('id', websiteId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('[builder] Error updating settings:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Creates a new page and links it to a website.
 */
export async function createPage(name: string, websiteId: string) {
  try {
    const supabase = await createServerClient();
    
    // 1. Create the page record
    const { data: pageData, error: pageError } = await supabase
      .from('pages')
      .insert({
        name,
        content: '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"className":"min-h-screen bg-white"},"nodes":[]}}',
        status: 'draft'
      })
      .select('id')
      .single();

    if (pageError) throw pageError;

    // 2. Link it to the website
    const { error: linkError } = await supabase
      .from('website_pages')
      .insert({
        website_id: websiteId,
        page_id: pageData.id,
        name,
        path_name: `/${name.toLowerCase().replace(/\\s+/g, '-')}`
      });

    if (linkError) throw linkError;

    return { success: true, pageId: pageData.id };
  } catch (error: any) {
    console.error('[builder] Error creating page:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Updates SEO and metadata for a specific page.
 */
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

    revalidatePath(`/pages/${pageId}`);
    return { success: true };
  } catch (error: any) {
    console.error('[builder] Error updating page settings:', error);
    return { success: false, error: error.message };
  }
}
