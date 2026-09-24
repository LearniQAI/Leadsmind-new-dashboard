import { NextRequest, NextResponse } from 'next/server';
import { resolveVideoAccess } from '@/lib/lms/video/videoAccess';
import { googleDriveVideoProvider } from '@/lib/lms/video/googleDriveVideoProvider';
import { clampRange, parseRangeHeader } from '@/lib/lms/drive/driveLinkSource';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';
// Each response is at most one CHUNK_BYTES slice (see below), which Drive serves in well under
// this; the cap just bounds a pathologically slow upstream.
export const maxDuration = 60;

// Why chunked, unlike the audio stream route: a browser <video> opens with `Range: bytes=0-` and
// reads the response for as long as the student watches. Proxied unbounded, one lecture would be
// one serverless invocation held open for the whole viewing, killed at the platform's max
// duration mid-playback. Answering every request with a bounded 206 (Content-Range says exactly
// which bytes came back) is standard HTTP the media stack already handles — it just asks for the
// next range — so each invocation is short no matter how long the video is. Seeking is a new
// range request, so it works the same way.
const CHUNK_BYTES = 8 * 1024 * 1024;

// Access-gated, same-origin proxy for Google-Drive-sourced lesson video — the raw Drive file id
// and share link never reach the client. See resolveVideoAccess for who gets bytes.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await resolveVideoAccess(id, req.nextUrl.searchParams.get('contentBlockId'));
    if (access.ok === false) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const range = clampRange(parseRangeHeader(req.headers.get('range')), CHUNK_BYTES);
    const stream = await googleDriveVideoProvider.getStream(access.fileId, range);

    return new NextResponse(stream.body as any, {
      status: stream.status,
      // Gated content: never let a shared cache hold it.
      headers: { ...stream.headers, 'cache-control': 'private, no-store' },
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
    const headers = { ...stream.headers, 'cache-control': 'private, no-store' };
    delete headers['content-length'];
    return new NextResponse(null, { status: 200, headers });
  } catch (err: any) {
    logger.error({ err }, 'lms.video.stream.head_failed');
    return new NextResponse(null, { status: 500 });
  }
}
