import { createAdminClient } from '@/lib/supabase/server'

/**
 * Edge-side mirror of the publish gate in lib/builder/publicSite.ts, used by middleware so that an
 * anonymous request for something not publicly live gets a REAL 404 status. (A notFound() thrown
 * inside the page answers 200 once the root layout has started streaming.) The page-level gate
 * stays the source of truth for what is rendered; this only decides the status for anonymous
 * visitors, so the two rules must stay identical:
 *   website: websites.is_published AND the page's pages.is_published
 *   funnel:  funnels.is_published
 */
export async function isPublicSiteServable(
  workspaceSlug: string,
  subdomain: string,
  pagePath: string, // '/' for the site root, otherwise '/about'
): Promise<boolean> {
  const supabase = createAdminClient()

  const { data: website } = await supabase
    .from('websites')
    .select('id, is_published, workspaces!inner(slug)')
    .eq('subdomain', subdomain)
    .eq('workspaces.slug', workspaceSlug)
    .maybeSingle()

  if (website) {
    if (!website.is_published) return false
    const { data: wsPages } = await supabase
      .from('website_pages')
      .select('path_name, pages(is_published)')
      .eq('website_id', website.id)
    if (!wsPages || wsPages.length === 0) return false
    let match = wsPages.find((p) => p.path_name === pagePath)
    if (!match && pagePath === '/') match = wsPages[0]
    const pg: any = Array.isArray(match?.pages) ? match?.pages[0] : match?.pages
    return !!pg?.is_published
  }

  const { data: funnel } = await supabase
    .from('funnels')
    .select('is_published, workspaces!inner(slug)')
    .eq('subdomain', subdomain)
    .eq('workspaces.slug', workspaceSlug)
    .maybeSingle()
  return !!funnel?.is_published
}

/**
 * Edge-side mirror of the published-only rule in app/actions/publicBlog.ts getPublicBlogPost, so an
 * anonymous request for a draft or unknown /blog/{slug} gets a real 404 status. On a tenant domain
 * the post must belong to that workspace; on the platform host the slug is looked up globally among
 * published posts (the same fallback the page uses). The page still enforces what is rendered.
 */
export async function isPublishedBlogPost(slug: string, workspaceId: string | null): Promise<boolean> {
  let query = createAdminClient()
    .from('blog_posts')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'published')
    .limit(1)
  if (workspaceId) query = query.eq('workspace_id', workspaceId)
  const { data } = await query
  return !!data && data.length > 0
}
