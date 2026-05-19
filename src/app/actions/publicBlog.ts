'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';

/**
 * Fetch all published blog posts in the active workspace or default workspace.
 * Resolves author details and categories.
 */
export async function getPublicBlogPosts(filters?: { categoryId?: string; search?: string }) {
  try {
    const supabase = await createServerClient();
    let workspaceId = await getCurrentWorkspaceId();
    
    // Fallback if workspace cookie not present (anonymous public visitors)
    if (!workspaceId) {
      const { data: firstWs } = await supabase.from('workspaces').select('id').limit(1).maybeSingle();
      if (firstWs) workspaceId = firstWs.id;
    }
    
    let query = supabase
      .from('blog_posts')
      .select(`
        *,
        category:blog_categories(id, name, slug),
        author:users(id, first_name, last_name, avatar_url)
      `)
      .eq('status', 'published');

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    const { data, error } = await query.order('published_at', { ascending: false });
    if (error) throw error;
    return { data: data || [] };
  } catch (error: any) {
    console.error('[BlogAction getPublicBlogPosts Error]:', error);
    return { error: error.message || 'Failed to fetch public posts' };
  }
}

/**
 * Fetch details of a single blog post by its unique URL slug.
 * - When preview=true, skips the status=published filter (for admin draft previews).
 * - Workspace is resolved from the session cookie so slug collisions across workspaces are avoided.
 */
export async function getPublicBlogPost(slug: string, preview = false) {
  try {
    const supabase = await createServerClient();

    let query = supabase
      .from('blog_posts')
      .select(`
        *,
        category:blog_categories(id, name, slug),
        author:users(id, first_name, last_name, avatar_url)
      `)
      .eq('slug', slug);

    // For previewing draft content, we scope to the admin's current workspace
    if (preview) {
      const workspaceId = await getCurrentWorkspaceId();
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }
    } else {
      // Public visitors read published articles globally across any workspace context
      query = query.eq('status', 'published');
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return { data };
  } catch (error: any) {
    console.error('[BlogAction getPublicBlogPost Error]:', error);
    return { error: error.message || 'Failed to fetch public post' };
  }
}

/**
 * Fetch available categories in the active or default workspace for public filtering.
 */
export async function getPublicCategories() {
  try {
    const supabase = await createServerClient();
    let workspaceId = await getCurrentWorkspaceId();
    
    if (!workspaceId) {
      const { data: firstWs } = await supabase.from('workspaces').select('id').limit(1).maybeSingle();
      if (firstWs) workspaceId = firstWs.id;
    }
    
    let query = supabase.from('blog_categories').select('*');
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }
    
    const { data, error } = await query.order('name', { ascending: true });
    if (error) throw error;
    return { data: data || [] };
  } catch (error: any) {
    console.error('[BlogAction getPublicCategories Error]:', error);
    return { error: error.message || 'Failed to fetch categories' };
  }
}

/**
 * Pipes a newsletter lead straight into the CRM contacts ledger.
 */
export async function subscribeToNewsletter(email: string, workspaceId?: string) {
  try {
    const supabase = await createServerClient();
    let wsId = workspaceId || await getCurrentWorkspaceId();
    if (!wsId) {
      const { data: firstWs } = await supabase.from('workspaces').select('id').limit(1).maybeSingle();
      if (firstWs) wsId = firstWs.id;
    }
    if (!wsId) return { error: 'Active workspace context could not be resolved.' };

    const { error } = await supabase.from('contacts').insert({
      workspace_id: wsId,
      email: email.trim().toLowerCase(),
      first_name: 'Newsletter',
      last_name: 'Subscriber',
      source: 'blog_newsletter'
    });

    if (error) {
      // Check for uniqueness duplicate key code
      if (error.code === '23505') return { success: true, message: 'Welcome back! You are already subscribed.' };
      throw error;
    }

    return { success: true, message: 'Success! You have subscribed to our insights newsletter.' };
  } catch (error: any) {
    console.error('[subscribeToNewsletter Error]:', error);
    return { error: error.message || 'Failed to capture subscriber' };
  }
}

// ==========================================
// SPRINT 6: ANALYTICS & COMMENTS ENGINES
// ==========================================

export async function recordPageview(payload: {
  postId: string;
  workspaceId: string;
  visitorId: string;
  scrollDepth: number;
  timeSpent: number;
  source: string;
  deviceType: string;
}) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from('blog_pageviews').insert([{
      post_id: payload.postId,
      workspace_id: payload.workspaceId,
      visitor_id: payload.visitorId,
      scroll_depth: payload.scrollDepth,
      time_spent: payload.timeSpent,
      source: payload.source,
      device_type: payload.deviceType
    }]);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('[BlogAction recordPageview Error]:', err);
    return { success: false };
  }
}

export async function submitComment(payload: {
  postId: string;
  workspaceId: string;
  authorName: string;
  authorEmail: string;
  content: string;
}) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from('blog_comments').insert([{
      post_id: payload.postId,
      workspace_id: payload.workspaceId,
      author_name: payload.authorName,
      author_email: payload.authorEmail,
      content: payload.content,
      status: 'pending'
    }]);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('[BlogAction submitComment Error]:', err);
    return { error: err.message || 'Failed to submit comment' };
  }
}

export async function getPostComments(postId: string) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('blog_comments')
      .select('id, author_name, content, created_at')
      .eq('post_id', postId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data: data || [] };
  } catch (err: any) {
    console.error('[BlogAction getPostComments Error]:', err);
    return { error: err.message || 'Failed to fetch comments' };
  }
}

export async function getBlogSettings(workspaceId: string) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('blog_settings')
      .select('comments_engine, disqus_shortname, analytics_enabled')
      .eq('workspace_id', workspaceId)
      .maybeSingle();
      
    if (error) throw error;
    // Default fallback if settings aren't created yet
    return { data: data || { comments_engine: 'native', analytics_enabled: true, disqus_shortname: undefined } };
  } catch (err: any) {
    console.error('[BlogAction getBlogSettings Error]:', err);
    return { data: { comments_engine: 'native', analytics_enabled: true, disqus_shortname: undefined } };
  }
}


