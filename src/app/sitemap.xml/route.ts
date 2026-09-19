import { createServerClient } from '@/lib/supabase/server';
import { resolvePublicSiteContext } from '@/lib/blog/publicWorkspace';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerClient();
    
    // Fetch all published posts
    // On a tenant's custom domain this is THAT workspace's blog at its own origin; on the platform
    // domain it stays the platform-wide sitemap. Never list another tenant's posts on a tenant domain.
    const { workspaceId, origin: baseUrl } = await resolvePublicSiteContext();
    let postsQuery = supabase
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('status', 'published');
    if (workspaceId) postsQuery = postsQuery.eq('workspace_id', workspaceId);
    const { data: posts } = await postsQuery.order('published_at', { ascending: false });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  ${(posts || [])
    .map(
      (post) => `  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${new Date(post.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
    )
    .join('\n')}
</urlset>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[Sitemap XML Error]:', error);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}
