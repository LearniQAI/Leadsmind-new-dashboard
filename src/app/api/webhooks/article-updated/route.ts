import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult;

  try {
    const body = await req.json();
    const { slug, title, event } = body;

    console.log(`[Article Updated Webhook] Event: ${event}, Article: "${title}" (${slug})`);

    const sitemapUrl = 'https://www.leadsmind.io/sitemap-articles.xml';
    
    // Notify search engines (Google and Bing) of the updated sitemap
    const googlePingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    const bingPingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;

    const pingPromises = [
      fetch(googlePingUrl)
        .then(res => ({ engine: 'Google', status: res.status }))
        .catch(err => ({ engine: 'Google', error: err.message })),
      fetch(bingPingUrl)
        .then(res => ({ engine: 'Bing', status: res.status }))
        .catch(err => ({ engine: 'Bing', error: err.message }))
    ];

    const pingResults = await Promise.all(pingPromises);
    console.log('[Article Updated Webhook] Ping Results:', pingResults);

    return NextResponse.json({
      success: true,
      message: `Article update trigger received for slug "${slug}". Search engine pings initiated.`,
      ping_results: pingResults
    });
  } catch (err: any) {
    console.error('[Article Updated Webhook Exception]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
