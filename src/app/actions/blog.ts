'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, getUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

const slugify = (t: string) => t.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');

export async function getCategories() {
  try {
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No active workspace context' };
    const { data, error } = await (await createServerClient()).from('blog_categories').select('*').eq('workspace_id', wsId).order('name', { ascending: true });
    if (error) throw error;
    return { data: data || [] };
  } catch (err: any) {
    return { error: err.message || 'Fetch categories failed' };
  }
}

export async function createCategory(name: string) {
  try {
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No active workspace context' };
    const { data, error } = await (await createServerClient()).from('blog_categories').insert({ workspace_id: wsId, name, slug: slugify(name) }).select().single();
    if (error) throw error;
    revalidatePath('/blog');
    return { data };
  } catch (err: any) {
    return { error: err.message || 'Category creation failed' };
  }
}

export async function getPosts(filters?: { status?: string; categoryId?: string; search?: string }) {
  try {
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No active workspace context' };
    let q = (await createServerClient()).from('blog_posts').select('*, category:blog_categories(id, name, slug), author:users(id, first_name, last_name, avatar_url)').eq('workspace_id', wsId);
    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.categoryId) q = q.eq('category_id', filters.categoryId);
    if (filters?.search) q = q.ilike('title', `%${filters.search}%`);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;
    return { data: data || [] };
  } catch (err: any) {
    return { error: err.message || 'Fetch posts failed' };
  }
}

export async function getPostDetails(postId: string) {
  try {
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No active workspace context' };
    const { data, error } = await (await createServerClient()).from('blog_posts').select('*, category:blog_categories(id, name, slug), author:users(id, first_name, last_name, avatar_url)').eq('id', postId).eq('workspace_id', wsId).single();
    if (error) throw error;
    return { data };
  } catch (err: any) {
    return { error: err.message || 'Fetch post details failed' };
  }
}

export async function createPost(postData: { title: string; category_id?: string }) {
  try {
    const user = await getUser();
    if (!user) return { error: 'Unauthorized user access' };
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No active workspace context' };

    const supabase = await createServerClient();
    let base = slugify(postData.title) || 'untitled-post';
    let slug = base, counter = 1;
    while (true) {
      const { data } = await supabase.from('blog_posts').select('id').eq('workspace_id', wsId).eq('slug', slug).maybeSingle();
      if (!data) break;
      slug = `${base}-${counter++}`;
    }

    const { data, error } = await supabase.from('blog_posts').insert({
      workspace_id: wsId,
      author_id: user.id,
      category_id: postData.category_id || null,
      title: postData.title,
      slug,
      status: 'draft',
      body_html: '',
      body_plain: ''
    }).select().single();

    if (error) throw error;
    revalidatePath('/blog');
    return { data };
  } catch (err: any) {
    return { error: err.message || 'Create post failed' };
  }
}

export async function updatePost(postId: string, updates: any) {
  try {
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No active workspace context' };
    const supabase = await createServerClient();

    // Filter out joined relations and system read-only columns
    const { author, category, created_at, updated_at, ...dbPayload } = updates;

    if (dbPayload.slug) {
      dbPayload.slug = slugify(dbPayload.slug);
      const { data } = await supabase.from('blog_posts').select('id').eq('workspace_id', wsId).eq('slug', dbPayload.slug).neq('id', postId).maybeSingle();
      if (data) return { error: 'Slug duplication detected in workspace' };
    }

    if (dbPayload.status === 'published') {
      dbPayload.published_at = dbPayload.published_at || new Date().toISOString();
      dbPayload.scheduled_at = null;
    } else if (dbPayload.status === 'scheduled' && !dbPayload.scheduled_at) {
      return { error: 'Scheduling date timestamp is required' };
    } else if (dbPayload.status === 'draft') {
      dbPayload.scheduled_at = null;
    }

    const { data, error } = await supabase.from('blog_posts').update({ ...dbPayload, updated_at: new Date().toISOString() }).eq('id', postId).eq('workspace_id', wsId).select().single();
    if (error) throw error;
    
    revalidatePath('/blog');
    if (data.slug) revalidatePath(`/blog/${data.slug}`);
    return { data };
  } catch (err: any) {
    return { error: err.message || 'Update post failed' };
  }
}

export async function deletePost(postId: string) {
  try {
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No active workspace context' };
    const { error } = await (await createServerClient()).from('blog_posts').delete().eq('id', postId).eq('workspace_id', wsId);
    if (error) throw error;
    revalidatePath('/blog');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Delete post failed' };
  }
}

export async function checkAndPublishScheduledPosts() {
  try {
    const supabase = await createServerClient();
    const now = new Date().toISOString();
    const { data, error: fError } = await supabase.from('blog_posts').select('id, slug').eq('status', 'scheduled').lte('scheduled_at', now);
    if (fError) throw fError;
    if (!data || data.length === 0) return { success: true, count: 0 };

    const { error: uError } = await supabase.from('blog_posts').update({ status: 'published', published_at: now, scheduled_at: null, updated_at: now }).in('id', data.map(p => p.id));
    if (uError) throw uError;

    revalidatePath('/blog');
    data.forEach(p => revalidatePath(`/blog/${p.slug}`));
    return { success: true, count: data.length };
  } catch (err: any) {
    return { error: err.message || 'Scheduled release check failed' };
  }
}
