import { extractGoogleDriveFileId } from '@/lib/lms/audio/googleDriveLinkParser';
import { logger } from '@/shared/logger';

// The Drive-level half of the "public Drive link" pipeline, shared by audio (googleDriveLinkProvider)
// and video (googleDriveVideoProvider). It knows how to talk to Drive and nothing about what kind of
// media is acceptable: each media provider layers its own MIME rules, metadata fields and
// admin-facing error copy on top. No OAuth: every call is Drive's public v3 REST API with a
// server-side API key. An API-key-only (unauthenticated) files.get can only ever see a file shared
// "Anyone with the link" (or fully public) — Drive returns 404, not 403, for anything else, which is
// exactly the "not shared publicly" signal both providers validate against.
const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';

function apiKey(): string {
  const key = process.env.GOOGLE_DRIVE_API_KEY;
  if (!key) throw new Error('GOOGLE_DRIVE_API_KEY is not configured');
  return key;
}

export function parseDriveFileId(shareUrl: string): string | null {
  return extractGoogleDriveFileId(shareUrl);
}

export type DriveMetadataResult =
  | { kind: 'ok'; data: Record<string, any> }
  | { kind: 'not_shared' }
  | { kind: 'network_error' }
  | { kind: 'unexpected_status'; status: number };

/** files.get with a caller-chosen `fields` mask. Never throws for a provider/network failure —
 *  the caller maps each outcome to its own actionable copy. */
export async function fetchDriveFileMetadata(fileId: string, fields: string): Promise<DriveMetadataResult> {
  let res: Response;
  try {
    const url = `${DRIVE_FILES_ENDPOINT}/${encodeURIComponent(fileId)}?key=${apiKey()}&fields=${encodeURIComponent(fields)}`;
    res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch (err) {
    logger.error({ err, fileId }, 'lms.drive.metadata.network_failure');
    return { kind: 'network_error' };
  }
  if (res.status === 404) return { kind: 'not_shared' };
  if (!res.ok) {
    logger.error({ status: res.status, fileId }, 'lms.drive.metadata.unexpected_status');
    return { kind: 'unexpected_status', status: res.status };
  }
  const data = await res.json().catch(() => null);
  return { kind: 'ok', data: data ?? {} };
}

export interface ByteRange {
  start: number;
  end?: number;
}

export interface DriveStreamResult {
  status: 200 | 206 | 416;
  headers: Record<string, string>;
  body: ReadableStream<Uint8Array>;
}

/** Parses a single-range `Range: bytes=a-b` / `bytes=a-` header. Suffix ranges (`bytes=-n`) and
 *  multi-range requests aren't something a media element sends, so they're treated as absent. */
export function parseRangeHeader(header: string | null): ByteRange | undefined {
  if (!header) return undefined;
  const match = /^bytes=(\d+)-(\d*)$/.exec(header.trim());
  if (!match) return undefined;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : undefined;
  if (!Number.isFinite(start)) return undefined;
  if (end !== undefined && (!Number.isFinite(end) || end < start)) return undefined;
  return { start, end };
}

/**
 * Bounds a requested range to at most `maxChunkBytes`. Media elements ask for `bytes=0-` (the
 * whole rest of the file) and read it as they play; proxied as-is, a 2 GB lecture would be one
 * serverless invocation that streams until the platform's max duration kills it mid-playback. A
 * bounded 206 is legal and every browser media stack handles it: the Content-Range tells it what
 * it got, and it simply issues the next range request when it needs more. A missing Range header
 * is treated as `bytes=0-` for the same reason.
 */
export function clampRange(range: ByteRange | undefined, maxChunkBytes: number): ByteRange {
  const start = range?.start ?? 0;
  const cap = start + maxChunkBytes - 1;
  const end = range?.end === undefined ? cap : Math.min(range.end, cap);
  return { start, end };
}

/** Why a Drive byte fetch failed, in terms an admin can act on (see DriveStreamError). */
export type DriveFailureCode =
  | 'not_shared' // 404 to an API-key request: not "Anyone with the link", or deleted
  | 'quota' // Drive's per-file download / rate quota is exhausted; clears on its own
  | 'forbidden' // 403 for another reason, e.g. the owner disabled downloading
  | 'not_media' // 200 but an HTML page, not media bytes
  | 'timeout' // Drive didn't answer in time
  | 'upstream'; // anything else

export class DriveStreamError extends Error {
  constructor(public code: DriveFailureCode, public upstreamStatus: number | null, message: string) {
    super(message);
    this.name = 'DriveStreamError';
  }
}

// Time allowed for Drive to START answering. Deliberately not AbortSignal.timeout(): that would also
// abort the body read, killing a long legitimate stream. Without any limit a stalled Drive connection
// holds the request open until the platform's max duration and the player just sees a dead source.
const DRIVE_CONNECT_TIMEOUT_MS = 20_000;

async function classifyDriveFailure(res: Response): Promise<DriveStreamError> {
  let reason = '';
  try {
    reason = (await res.json())?.error?.errors?.[0]?.reason ?? '';
  } catch {
    /* body wasn't JSON */
  }
  if (res.status === 404) return new DriveStreamError('not_shared', 404, 'Drive returned 404');
  if (res.status === 403 || res.status === 429) {
    const quota = res.status === 429 || /quota|ratelimit/i.test(reason);
    return new DriveStreamError(quota ? 'quota' : 'forbidden', res.status, `Drive returned ${res.status} (${reason || 'no reason'})`);
  }
  return new DriveStreamError('upstream', res.status, `Drive returned ${res.status}`);
}

/** Proxies the file's bytes, honoring an optional byte range. Throws DriveStreamError on failure. */
export async function streamDriveFile(fileId: string, range?: ByteRange): Promise<DriveStreamResult> {
  const url = `${DRIVE_FILES_ENDPOINT}/${encodeURIComponent(fileId)}?alt=media&key=${apiKey()}`;
  const headers: Record<string, string> = {};
  if (range) {
    headers.Range = `bytes=${range.start}-${range.end ?? ''}`;
  }

  const controller = new AbortController();
  const connectTimer = setTimeout(() => controller.abort(), DRIVE_CONNECT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { headers, signal: controller.signal });
  } catch (err) {
    logger.error({ err, fileId }, 'lms.drive.stream.connect_failed');
    throw new DriveStreamError('timeout', null, 'Drive did not respond in time');
  } finally {
    clearTimeout(connectTimer);
  }
  // A range starting at/after EOF (a seek racing a stale duration) — pass Drive's 416 through as
  // a real 416 so the media element handles it, rather than surfacing it as a server error.
  if (res.status === 416) {
    await res.body?.cancel();
    return {
      status: 416,
      headers: { 'content-range': res.headers.get('content-range') ?? 'bytes */*' },
      body: new ReadableStream({ start: (c) => c.close() }),
    };
  }
  if (!res.ok && res.status !== 206) {
    const failure = await classifyDriveFailure(res);
    logger.error({ status: res.status, fileId, code: failure.code }, 'lms.drive.stream.upstream_failure');
    throw failure;
  }
  if (!res.body) {
    throw new DriveStreamError('upstream', res.status, 'Drive stream returned no body');
  }
  // Drive can answer 200 with an HTML page (e.g. a virus-scan / quota interstitial) instead of
  // bytes. The API endpoint doesn't normally, but an HTML body must never be proxied as "audio".
  if ((res.headers.get('content-type') ?? '').toLowerCase().startsWith('text/html')) {
    await res.body.cancel();
    logger.error({ fileId }, 'lms.drive.stream.html_instead_of_media');
    throw new DriveStreamError('not_media', res.status, 'Drive returned an HTML page instead of file bytes');
  }

  const outHeaders: Record<string, string> = {};
  const passthrough = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
  for (const h of passthrough) {
    const v = res.headers.get(h);
    if (v) outHeaders[h] = v;
  }
  if (!outHeaders['accept-ranges']) outHeaders['accept-ranges'] = 'bytes';

  return {
    status: res.status === 206 ? 206 : 200,
    headers: outHeaders,
    body: res.body,
  };
}
