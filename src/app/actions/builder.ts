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
