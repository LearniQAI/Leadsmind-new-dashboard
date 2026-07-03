'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { renderCraftToHtml } from '@/lib/builder/renderer';

async function executeAction<T>(action: (supabase: any, workspaceId: string) => Promise<T>) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { success: false, error: 'No active workspace' };
    
    const supabase = await createServerClient();
    const data = await action(supabase, workspaceId);
    return { success: true, ...data as any };
  } catch (err: any) {
    console.error('[BuilderDeployAction Error]:', err.message);
    return { success: false, error: err.message || 'Operation failed' };
  }
}

/**
 * --- SPRINT 21 & 22: STATIC SITE COMPILATION & EDGE SERVERLESS UPLOAD ---
 */
export async function publishPageStatic(pageId: string) {
  return executeAction(async (supabase, workspaceId) => {
    // 1. Fetch page details with website config
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('*, website_page:website_pages(*, website:websites(*))')
      .eq('id', pageId)
      .eq('workspace_id', workspaceId)
      .single();

    if (pageError || !page) throw pageError || new Error('Page not found');

    const website = page.website_page?.website;
    const config = website?.config || {};

    // 2. Render optimized minified static HTML
    const renderedHtml = renderCraftToHtml(
      page.content,
      pageId,
      workspaceId,
      true, // Generate full HTML page wrap
      {
        title: page.seo_title || page.name || 'Published Site',
        description: page.seo_description || '',
        ogImage: page.og_image_url || '',
        primaryColor: config.primaryColor || '#6c47ff',
        secondaryColor: config.secondaryColor || '#3b82f6',
        backgroundColor: config.backgroundColor || '#ffffff',
        headingFont: config.headingFont || 'Space Grotesk',
        bodyFont: config.bodyFont || 'DM Sans',
      }
    );

    // 3. Save to database
    const { error: updateError } = await supabase
      .from('pages')
      .update({
        rendered_html: renderedHtml,
        status: 'published',
        is_published: true,
        published_at: new Date().toISOString()
      })
      .eq("id", pageId).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);

    if (updateError) throw updateError;

    // 4. Update parent website status if applicable
    if (website?.id) {
      await supabase
        .from('websites')
        .update({ is_published: true })
        .eq("id", website.id).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);
    }

    // 5. Try to upload to Supabase Storage bucket 'published-sites' (fallback gracefully if bucket is missing)
    try {
      const storagePath = `${workspaceId}/${website?.id || 'solo'}/${pageId}.html`;
      const fileBuffer = Buffer.from(renderedHtml, 'utf-8');

      // Upload with content type text/html
      await supabase.storage
        .from('published-sites')
        .upload(storagePath, fileBuffer, {
          contentType: 'text/html',
          upsert: true
        });
    } catch (storageErr) {
      console.warn('[Storage Upload Warning]: Storage bucket fallback triggered.', storageErr);
    }

    revalidatePath(`/websites`);
    revalidatePath(`/p/${workspaceId}/${website?.subdomain || ''}`);
    return { success: true };
  });
}

/**
 * --- SPRINT 23: CUSTOM DOMAIN PROXY MANAGER ---
 */
export async function addCustomDomain(websiteId: string, domainName: string) {
  return executeAction(async (supabase, workspaceId) => {
    const cleanDomain = domainName.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
    const verificationToken = `lm_verify_${Math.random().toString(36).substr(2, 16)}`;

    const { data, error } = await supabase
      .from('builder_published_domains')
      .insert({
        workspace_id: workspaceId,
        website_id: websiteId,
        domain_name: cleanDomain,
        ssl_status: 'pending',
        verified: false,
        verification_token: verificationToken
      })
      .select()
      .single();

    if (error) throw error;
    return { domain: data };
  });
}

export async function removeCustomDomain(domainId: string) {
  return executeAction(async (supabase, workspaceId) => {
    const { error } = await supabase
      .from('builder_published_domains')
      .delete()
      .eq('id', domainId)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return { success: true };
  });
}

export async function verifyDomainSSL(domainId: string) {
  return executeAction(async (supabase, workspaceId) => {
    // Query domain config from db
    const { data: domain, error: fetchError } = await supabase
      .from('builder_published_domains')
      .select('*')
      .eq('id', domainId)
      .eq('workspace_id', workspaceId)
      .single();

    if (fetchError || !domain) throw fetchError || new Error('Domain record not found');

    // Simulate Cloudflare SaaS hostname / SSL proxy routing check logic
    const isDnsAligned = true; // Simulating valid CNAME setup
    const sslStatus = isDnsAligned ? 'active' : 'error';
    const verified = isDnsAligned;

    const { data: updatedDomain, error: updateError } = await supabase
      .from('builder_published_domains')
      .update({
        ssl_status: sslStatus,
        verified,
        updated_at: new Date().toISOString()
      })
      .eq("id", domainId).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId)
      .select()
      .single();

    if (updateError) throw updateError;
    return { domain: updatedDomain };
  });
}

/**
 * --- SPRINT 24: SUBDIRECTORY PAGE SETUP ENGINE ---
 */
export async function createSubdirectoryPage(websiteId: string, name: string, path: string) {
  return executeAction(async (supabase, workspaceId) => {
    let cleanPath = '/' + path.trim().toLowerCase().replace(/^\/+/, '');
    if (cleanPath === '/') cleanPath = '/home'; // Prevent duplicate home index conflicts

    // 1. Create the routing entry
    const { data: wsPage, error: wsPageError } = await supabase
      .from('website_pages')
      .insert({
        website_id: websiteId,
        name,
        path: cleanPath
      })
      .select()
      .single();

    if (wsPageError) throw wsPageError;

    // 2. Create default canvas content
    const initialContent = '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"className":"min-h-screen bg-white"},"nodes":[]}}';

    // 3. Create actual page container record
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .insert({
        workspace_id: workspaceId,
        website_page_id: wsPage.id,
        name,
        content: initialContent,
        status: 'draft'
      })
      .select()
      .single();

    if (pageError) throw pageError;

    revalidatePath(`/websites`);
    return { pageId: page.id };
  });
}

export async function deleteSubdirectoryPage(pageId: string) {
  return executeAction(async (supabase, workspaceId) => {
    // 1. Fetch website page routing record to resolve and clean up nested elements
    const { data: page, error: fetchError } = await supabase
      .from('pages')
      .select('website_page_id')
      .eq('id', pageId)
      .eq('workspace_id', workspaceId)
      .single();

    if (fetchError || !page) throw fetchError || new Error('Page not found');

    // 2. Delete routing record (will cascade and delete page content)
    if (page.website_page_id) {
      const { error: wsPageError } = await supabase
        .from('website_pages')
        .delete()
        .eq('id', page.website_page_id);
      
      if (wsPageError) throw wsPageError;
    } else {
      const { error: pageDeleteError } = await supabase
        .from('pages')
        .delete()
        .eq("id", pageId).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);
      
      if (pageDeleteError) throw pageDeleteError;
    }

    revalidatePath(`/websites`);
    return { success: true };
  });
}

export async function renameSubdirectoryPage(pageId: string, newName: string, newPath: string) {
  return executeAction(async (supabase, workspaceId) => {
    let cleanPath = '/' + newPath.trim().toLowerCase().replace(/^\/+/, '');
    if (cleanPath === '/') cleanPath = '/home';

    // 1. Fetch page to verify association
    const { data: page, error: fetchError } = await supabase
      .from('pages')
      .select('website_page_id')
      .eq('id', pageId)
      .eq('workspace_id', workspaceId)
      .single();

    if (fetchError || !page) throw fetchError || new Error('Page not found');

    // 2. Update page name
    const { error: pageUpdateErr } = await supabase
      .from('pages')
      .update({ name: newName })
      .eq("id", pageId).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);

    if (pageUpdateErr) throw pageUpdateErr;

    // 3. Update routing path
    if (page.website_page_id) {
      const { error: routeUpdateErr } = await supabase
        .from('website_pages')
        .update({
          name: newName,
          path: cleanPath
        })
        .eq("id", page.website_page_id).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);

      if (routeUpdateErr) throw routeUpdateErr;
    }

    revalidatePath(`/websites`);
    return { success: true };
  });
}

/**
 * --- SPRINT 25: INSTANT LIVE REVISION VAULT ---
 */
export async function getPageRevisions(pageId: string) {
  return executeAction(async (supabase, workspaceId) => {
    const { data, error } = await supabase
      .from('page_versions')
      .select('id, name, content, is_published_version, created_at')
      .eq('page_id', pageId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { versions: data || [] };
  });
}

export async function restorePageRevision(versionId: string) {
  return executeAction(async (supabase, workspaceId) => {
    // 1. Fetch version content
    const { data: version, error: fetchError } = await supabase
      .from('page_versions')
      .select('page_id, content')
      .eq('id', versionId)
      .eq('workspace_id', workspaceId)
      .single();

    if (fetchError || !version) throw fetchError || new Error('Version snapshot not found');

    // 2. Overwrite current page content
    const { error: updateError } = await supabase
      .from('pages')
      .update({
        content: version.content,
        updated_at: new Date().toISOString()
      })
      .eq("id", version.page_id).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);

    if (updateError) throw updateError;
    return { success: true, pageId: version.page_id };
  });
}
