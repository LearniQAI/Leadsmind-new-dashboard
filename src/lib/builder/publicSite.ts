import { notFound } from 'next/navigation';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';

// Public serving of website-builder sites and funnels (the /p/{workspaceSlug}/{subdomain}[/page]
// routes; custom domains are middleware rewrites into the same routes, so this one gate covers both).
//
// Rule: anonymous visitors only ever see PUBLISHED content. Anything else is a real 404 (never a
// 200 page, never a hint that a draft exists). The one exception is draft preview for an
// authenticated member of the owning workspace — the editor's "view" links open /p/... in a new tab
// of the same browser session, so the session cookie is what authorises the preview.
//
// Websites: websites.is_published AND the page's own pages.is_published.
// Funnels: funnels.is_published only — funnel publishing is a single toggle on the funnel and
// never sets pages.is_published on its steps (live funnels have draft-flagged step pages).

export interface PublicSitePage {
  content: string;
  websiteData: any;
  pages: { id: string; name: string; slug: string }[];
  websiteId?: string;
  funnelId?: string;
  /** True when the viewer is a workspace member looking at something not publicly live. */
  isDraftPreview: boolean;
}

async function isWorkspaceMember(workspaceId: string): Promise<boolean> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: member } = await createAdminClient()
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();
    return !!member;
  } catch {
    return false;
  }
}

const firstPage = (rel: any): { content?: any; is_published?: boolean } | null =>
  (Array.isArray(rel) ? rel[0] : rel) ?? null;

/**
 * Resolve the page to render, or call notFound(). `targetPath` is the website_pages/funnel_steps
 * path ('/' for the site root).
 */
export async function loadPublicSitePage(
  workspaceSlug: string,
  subdomain: string,
  targetPath: string,
): Promise<PublicSitePage> {
  const supabase = createAdminClient();

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', workspaceSlug)
    .maybeSingle();
  if (!workspace?.id) notFound();

  const { data: website } = await supabase
    .from('websites')
    .select('*')
    .eq('workspace_id', workspace.id)
    .eq('subdomain', subdomain)
    .maybeSingle();

  let content: string | null = null;
  let pagePublished = true;
  let live = false;
  let websiteData: any = null;
  let pages: PublicSitePage['pages'] = [];
  let websiteId: string | undefined;
  let funnelId: string | undefined;

  if (website) {
    live = !!website.is_published;
    websiteId = website.id;
    websiteData = { ...website, workspaceSlug };

    const { data: wsPages } = await supabase
      .from('website_pages')
      .select('id, name, path_name, pages(content, is_published)')
      .eq('website_id', website.id);

    if (wsPages) {
      pages = wsPages.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.path_name.replace(/^\/+/, '') || 'home',
      }));
      let match = wsPages.find((p) => p.path_name === targetPath);
      // The site root falls back to the first page when no '/' page exists.
      if (!match && targetPath === '/' && wsPages.length > 0) match = wsPages[0];
      const pg = firstPage(match?.pages);
      content = (pg?.content as string) || null;
      pagePublished = !!pg?.is_published;
    }
  } else {
    const { data: funnel } = await supabase
      .from('funnels')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('subdomain', subdomain)
      .maybeSingle();

    if (funnel) {
      live = !!funnel.is_published;
      funnelId = funnel.id;
      websiteData = { ...funnel, workspaceSlug };

      const { data: steps } = await supabase
        .from('funnel_steps')
        .select('id, name, path_name, pages(content)')
        .eq('funnel_id', funnel.id)
        .order('order', { ascending: true });

      if (steps) {
        pages = steps.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.path_name.replace(/^\/+/, '') || 'step',
        }));
        const match = targetPath === '/' ? steps[0] : steps.find((s) => s.path_name === targetPath);
        content = (firstPage(match?.pages)?.content as string) || null;
      }
    }
  }

  // Nothing there at all: a real 404 for everyone.
  if (!websiteData || !content) notFound();

  const publiclyLive = live && pagePublished;
  if (!publiclyLive && !(await isWorkspaceMember(workspace.id))) notFound();

  return { content, websiteData, pages, websiteId, funnelId, isDraftPreview: !publiclyLive };
}
