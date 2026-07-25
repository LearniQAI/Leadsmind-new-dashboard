import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { logger } from '@/shared/logger';

// Constant-time shared-secret comparison — same standing pattern as every other webhook
// signature/token check in this codebase (webhooks/avatar-generator, webhooks/meta,
// lib/calendar/payfast). A plain `===` leaks timing information proportional to the number
// of matching leading bytes.
function isValidWebhookSecret(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const providedBuf = Buffer.from(provided, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

export async function POST(req: NextRequest) {
  // This route previously used generic session auth (requireAuth) — meaning any logged-in
  // Leadsmind user of any workspace, with no role restriction, could trigger it — despite
  // living under webhooks/* where every sibling route requires a real shared secret or
  // signature instead. Aligned to that same pattern: an internal CMS/publish trigger, not a
  // user-session-gated action, so a shared secret (not a per-workspace role) is the correct
  // trust model here.
  const secret = process.env.ARTICLE_UPDATED_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('[FATAL] ARTICLE_UPDATED_WEBHOOK_SECRET is not configured');
  }
  const providedSecret = req.headers.get('x-webhook-secret');
  if (!isValidWebhookSecret(providedSecret, secret)) {
    logger.warn({}, 'webhook.article_updated.secret.invalid');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
