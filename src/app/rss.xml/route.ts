import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { resolvePublicSiteContext } from '@/lib/blog/publicWorkspace';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerClient();
    
    // Fetch all published posts with author resolution
    // On a tenant's custom domain this is THAT workspace's feed at its own origin; on the platform
    // domain it stays the platform-wide feed. Never list another tenant's posts on a tenant domain.
    const { workspaceId, origin: baseUrl } = await resolvePublicSiteContext();
    let postsQuery = supabase
      .from('blog_posts')
      .select('title, slug, summary, published_at, author:users(first_name, last_name)')
      .eq('status', 'published');
    if (workspaceId) postsQuery = postsQuery.eq('workspace_id', workspaceId);
    const { data: posts } = await postsQuery.order('published_at', { ascending: false });

    let channelTitle = 'LeadsMind Corporate Insights';
    let channelDescription = 'Curated growth frameworks, conversion blueprints, and marketing technology insights.';
    if (workspaceId) {
      const { data: workspace } = await createAdminClient().from('workspaces').select('name').eq('id', workspaceId).maybeSingle();
      channelTitle = workspace?.name ? `${workspace.name} Blog` : 'Blog';
      channelDescription = `Latest posts from ${workspace?.name || 'our blog'}.`;
    }

    const itemsXml = (posts || [])
      .map((post) => {
        const authorData: any = Array.isArray(post.author) ? post.author[0] : post.author;
        const authorName = authorData 
          ? `${authorData.first_name || ''} ${authorData.last_name || ''}`.trim()
          : 'LeadsMind Editor';
        
        return `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid>${baseUrl}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
      <author>${authorName}</author>
      <description><![CDATA[${post.summary || ''}]]></description>
    </item>`;
      })
      .join('\n');

    const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${channelTitle}]]></title>
    <link>${baseUrl}/blog</link>
    <description><![CDATA[${channelDescription}]]></description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
    ${itemsXml}
  </channel>
</rss>`;

    return new Response(rss, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[RSS XML Error]:', error);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>LeadsMind</title></channel></rss>', {
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}
