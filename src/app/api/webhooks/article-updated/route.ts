import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { logger } from '@/shared/logger';

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult;

  try {
    const body = await req.json();
    const { slug, title, event } = body;

    logger.info({ event, slug, title }, 'webhook.article_updated.received');

    const sitemapUrl = 'https://www.leadsmind.io/sitemap-articles.xml';
    
    // Notify search engines (Google and Bing) of the updated sitemap
    const googlePingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    const bingPingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;

    const pingPromises = [
      fetch(googlePingUrl)
        .then(res => ({ engine: 'Google', status: res.status }))
        .catch(err => {
          logger.warn({ err, engine: 'Google' }, 'webhook.article_updated.sitemap_ping.failed');
          return { engine: 'Google', error: 'Ping failed' };
        }),
      fetch(bingPingUrl)
        .then(res => ({ engine: 'Bing', status: res.status }))
        .catch(err => {
          logger.warn({ err, engine: 'Bing' }, 'webhook.article_updated.sitemap_ping.failed');
          return { engine: 'Bing', error: 'Ping failed' };
        })
    ];

    const pingResults = await Promise.all(pingPromises);
    logger.info({ pingResults }, 'webhook.article_updated.ping_results');

    return NextResponse.json({
      success: true,
      message: `Article update trigger received for slug "${slug}". Search engine pings initiated.`,
      ping_results: pingResults
    });
  } catch (err: any) {
    logger.error({ err }, 'webhook.article_updated.failed');
    return NextResponse.json({ error: 'Article update webhook failed.' }, { status: 500 });
  }
}
