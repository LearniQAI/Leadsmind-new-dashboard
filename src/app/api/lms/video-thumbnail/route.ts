import { NextRequest, NextResponse } from 'next/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Live thumbnail preview for the admin video block editor (PRD Section 6). YouTube and Vimeo
// both expose a public, credential-free oEmbed endpoint that returns a real thumbnail_url —
// fetched server-side here to avoid browser CORS restrictions. (Google Drive, the third video
// provider, doesn't come through here: it has its own validate route and gated poster route.)
const OEMBED_ENDPOINTS: Record<string, (canonicalUrl: string) => string> = {
  youtube: (u) => `https://www.youtube.com/oembed?url=${encodeURIComponent(u)}&format=json`,
  vimeo: (u) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(u)}`
};

function toCanonicalUrl(provider: string, idOrUrl: string): string {
  const trimmed = idOrUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // Bare ID pasted instead of a full link — build the canonical URL per provider.
  switch (provider) {
    case 'youtube':
      return `https://www.youtube.com/watch?v=${trimmed}`;
    case 'vimeo':
      return `https://vimeo.com/${trimmed}`;
    default:
      return trimmed;
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireLmsInstructor();

    const { searchParams } = new URL(req.url);
    const provider = searchParams.get('provider') || '';
    const idOrUrl = searchParams.get('url') || '';

    if (!provider || !idOrUrl) {
      return NextResponse.json({ error: 'Missing provider or url parameter' }, { status: 400 });
    }

    const buildEndpoint = OEMBED_ENDPOINTS[provider];
    if (!buildEndpoint) {
      return NextResponse.json({ error: `Unsupported video provider: ${provider}` }, { status: 400 });
    }

    const canonicalUrl = toCanonicalUrl(provider, idOrUrl);
    const endpoint = buildEndpoint(canonicalUrl);

    const res = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      return NextResponse.json({ error: `Could not resolve a ${provider} video at that link/ID` }, { status: 404 });
    }

    const data = await res.json();
    if (!data.thumbnail_url) {
      return NextResponse.json({ error: 'No thumbnail available for this video' }, { status: 404 });
    }

    return NextResponse.json({
      thumbnailUrl: data.thumbnail_url,
      title: data.title || null,
      // Real duration, only when the provider's oEmbed response actually includes one
      // (Vimeo's does, in seconds; YouTube's oEmbed does not) — never fabricated.
      durationSeconds: typeof data.duration === 'number' ? Math.round(data.duration) : null,
      canonicalUrl
    });
  } catch (err: any) {
    logger.error({ err }, 'lms.video-thumbnail.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
