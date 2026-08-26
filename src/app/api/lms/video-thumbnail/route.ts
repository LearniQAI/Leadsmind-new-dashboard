import { NextRequest, NextResponse } from 'next/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Live thumbnail preview for the admin video block editor (PRD Section 6). YouTube, Vimeo,
// and Wistia all expose a public, credential-free oEmbed endpoint that returns a real
// thumbnail_url — fetched server-side here to avoid browser CORS restrictions and to keep
// any future provider credentials off the client. Bunny.net and AWS have no such public,
// account-agnostic thumbnail API (Bunny needs the workspace's own pull-zone hostname; AWS/S3
// has no thumbnail concept at all without server-side frame extraction) — both are reported
// as unsupported rather than faking a preview.
const OEMBED_ENDPOINTS: Record<string, (canonicalUrl: string) => string> = {
  youtube: (u) => `https://www.youtube.com/oembed?url=${encodeURIComponent(u)}&format=json`,
  vimeo: (u) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(u)}`,
  wistia: (u) => `https://fast.wistia.com/oembed?url=${encodeURIComponent(u)}`
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
    case 'wistia':
      return `https://home.wistia.com/medias/${trimmed}`;
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
      return NextResponse.json({
        unsupported: true,
        reason: provider === 'bunny'
          ? "Bunny.net thumbnails require the workspace's own Stream pull-zone hostname, which isn't configured yet."
          : provider === 'aws'
          ? 'AWS-hosted raw video files have no thumbnail API — a frame would need to be server-side extracted, which is not wired up.'
          : `Unknown provider: ${provider}`
      });
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
      canonicalUrl
    });
  } catch (err: any) {
    logger.error({ err }, 'lms.video-thumbnail.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
