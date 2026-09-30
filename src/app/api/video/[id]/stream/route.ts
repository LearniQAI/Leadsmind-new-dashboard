import { NextRequest, NextResponse } from 'next/server';
import { resolveVideoAccess } from '@/lib/lms/video/videoAccess';
import { googleDriveVideoProvider } from '@/lib/lms/video/googleDriveVideoProvider';
import { clampRange, parseRangeHeader } from '@/lib/lms/drive/driveLinkSource';
import { readCachedVideo, fillVideoCache } from '@/lib/lms/video/videoCache';
import { waitUntil } from '@vercel/functions';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';
// Each response is at most one CHUNK_BYTES slice (see below), which Drive serves in well under a
// minute. The ceiling is higher than that because the first play of a file also copies it into
// Storage in the background (videoCache.ts) via waitUntil, which shares this limit: a 200 MB file
// at Drive's ~1 MB/s needs several minutes.
export const maxDuration = 300;

// The bytes behind /api/video/<assetId>/stream never change (google_drive_file_id is never updated
// after the asset row is created), so the browser may keep them for good. `private` keeps shared
// caches/CDNs out — access is per-viewer (see resolveVideoAccess). The ETag is the validator Chrome
// needs to cache the partial-content (206) chunks a <video> element requests.
const CACHE_CONTROL = 'private, max-age=31536000, immutable';
const etagFor = (fileId: string) => `"${fileId}"`;

// Why chunked, unlike the audio stream route: a browser <video> opens with `Range: bytes=0-` and
// reads the response for as long as the student watches. Proxied unbounded, one lecture would be
// one serverless invocation held open for the whole viewing, killed at the platform's max
// duration mid-playback. Answering every request with a bounded 206 (Content-Range says exactly
// which bytes came back) is standard HTTP the media stack already handles — it just asks for the
// next range — so each invocation is short no matter how long the video is. Seeking is a new
// range request, so it works the same way.
const CHUNK_BYTES = 8 * 1024 * 1024;
// Slice size when serving the stored copy. Storage is fast and needs no per-request Drive round
// trip, so a bigger slice costs little — and it matters for the browser's own cache: Chrome can
// only answer an open-ended `Range: bytes=0-` from its HTTP cache when the cached response ran to
// the end of the file. With 8 MB slices every return visit re-downloaded from the second slice on;
// with this size a typical lesson video (6–57 MB in the real library) is one slice for most files
// and the return visit is served from the browser cache. Still bounded, for the same reason as above.
const CACHED_CHUNK_BYTES = 32 * 1024 * 1024;

// Access-gated, same-origin proxy for Google-Drive-sourced lesson video — the raw Drive file id
// and share link never reach the client. See resolveVideoAccess for who gets bytes.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await resolveVideoAccess(id, req.nextUrl.searchParams.get('contentBlockId'));
    if (access.ok === false) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const validators = { 'cache-control': CACHE_CONTROL, etag: etagFor(access.fileId) };

    // Unchanged for this browser (it revalidated, e.g. after a hard refresh): no bytes at all.
    // Only reached AFTER resolveVideoAccess, so a viewer who lost access never gets a 304 either.
    if (req.headers.get('if-none-match') === validators.etag && !req.headers.get('range')) {
      return new NextResponse(null, { status: 304, headers: validators });
    }

    const requested = parseRangeHeader(req.headers.get('range'));

    // Stored copy first (any viewer who passed the gate above), still bounded per response.
    const cached = await readCachedVideo(access.fileId, clampRange(requested, CACHED_CHUNK_BYTES));
    if (cached) {
      return new NextResponse(cached.body as any, { status: cached.status, headers: { ...cached.headers, ...validators } });
    }

    const stream = await googleDriveVideoProvider.getStream(access.fileId, clampRange(requested, CHUNK_BYTES));
    // Miss: this request streams straight from Drive (nobody waits on the copy) and the file is
    // stored in the background so every later request is served from Storage.
    if (stream.status !== 416) waitUntil(fillVideoCache(access.fileId));

    return new NextResponse(stream.body as any, {
      status: stream.status,
      headers: stream.status === 416 ? stream.headers : { ...stream.headers, ...validators },
    });
  } catch (err: any) {
    logger.error({ err }, 'lms.video.stream.failed');
    return NextResponse.json({ error: 'Failed to stream video' }, { status: 500 });
  }
}

export async function HEAD(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await resolveVideoAccess(id, req.nextUrl.searchParams.get('contentBlockId'));
    if (access.ok === false) {
      return new NextResponse(null, { status: access.status });
    }

    // Drive has no true HEAD support — request a 1-byte range to surface Content-Range (and
    // therefore total size) without pulling the file.
    const stream = await googleDriveVideoProvider.getStream(access.fileId, { start: 0, end: 0 });
    await stream.body.cancel();
    const headers = { ...stream.headers, 'cache-control': CACHE_CONTROL, etag: etagFor(access.fileId) };
    delete headers['content-length'];
    return new NextResponse(null, { status: 200, headers });
  } catch (err: any) {
    logger.error({ err }, 'lms.video.stream.head_failed');
    return new NextResponse(null, { status: 500 });
  }
}
