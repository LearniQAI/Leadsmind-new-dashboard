import { NextRequest, NextResponse } from 'next/server';
import { resolveVideoAccess } from '@/lib/lms/video/videoAccess';
import { googleDriveVideoProvider } from '@/lib/lms/video/googleDriveVideoProvider';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Drive's own thumbnail for the video, used as the <video poster> and as the builder canvas
// preview. Drive's thumbnailLink expires within hours, so nothing is stored: each request asks
// Drive for a fresh link and proxies the image (same access gate as the stream — the thumbnail
// URL is file-specific). The link is fetched server-side from whatever Drive's API returned, so
// its host is pinned to Google's image CDN before we follow it. 404 when Drive has no thumbnail
// (still processing, or a format it can't thumbnail) — the player then just shows the first frame.
const ALLOWED_THUMBNAIL_HOST = /(^|\.)googleusercontent\.com$/;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await resolveVideoAccess(id, req.nextUrl.searchParams.get('contentBlockId'));
    if (access.ok === false) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const link = await googleDriveVideoProvider.getFreshThumbnailLink(access.fileId);
    if (!link) return new NextResponse(null, { status: 404 });

    let url: URL;
    try {
      url = new URL(link);
    } catch {
      return new NextResponse(null, { status: 404 });
    }
    if (!ALLOWED_THUMBNAIL_HOST.test(url.hostname)) {
      logger.warn({ host: url.hostname }, 'lms.video.poster.unexpected_host');
      return new NextResponse(null, { status: 404 });
    }
    // thumbnailLink ends in a size suffix (e.g. "=s220") — ask for one big enough for a player.
    const sized = link.replace(/=s\d+$/, '=s1280');

    const res = await fetch(sized, { signal: AbortSignal.timeout(10_000) });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !res.body || !contentType.startsWith('image/')) {
      await res.body?.cancel();
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(res.body as any, {
      status: 200,
      headers: {
        'content-type': contentType,
        // Per-viewer (gated) and the upstream link is short-lived: cache in the browser only.
        'cache-control': 'private, max-age=3600',
      },
    });
  } catch (err: any) {
    logger.error({ err }, 'lms.video.poster.failed');
    return new NextResponse(null, { status: 500 });
  }
}
