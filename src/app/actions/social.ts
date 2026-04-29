'use server';

import { createServerClient } from '@/lib/supabase/server';

/**
 * Publishes a post to connected social media platforms.
 */
export async function publishSocialPost(postId: string) {
  try {
    const supabase = await createServerClient();
    
    // 1. Fetch post details
    const { data: post, error: fetchError } = await supabase
      .from('social_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Logic for publishing (mock for now, usually calls External APIs)
    // Here we update the status
    const { error: updateError } = await supabase
      .from('social_posts')
      .update({ 
        status: 'published',
        published_at: new Date().toISOString()
      })
      .eq('id', postId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error: any) {
    console.error('[social] Publish error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Creates a new social media post record.
 */
export async function createSocialPost(data: any) {
  try {
    const supabase = await createServerClient();
    
    const { data: post, error } = await supabase
      .from('social_posts')
      .insert({
        ...data,
        status: 'draft',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;

    return { success: true, id: post.id };
  } catch (error: any) {
    console.error('[social] Create error:', error);
    return { success: false, error: error.message };
  }
}
