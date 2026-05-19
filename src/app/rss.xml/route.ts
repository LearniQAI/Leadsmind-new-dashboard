import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerClient();
    
    // Fetch all published posts with author resolution
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('title, slug, summary, published_at, author:users(first_name, last_name)')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    const baseUrl = 'https://www.leadsmind.io';

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
    <title>LeadsMind Corporate Insights</title>
    <link>${baseUrl}/blog</link>
    <description>Curated growth frameworks, conversion blueprints, and marketing technology insights.</description>
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
export default GET;
