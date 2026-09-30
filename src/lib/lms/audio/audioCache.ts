import { createAdminClient } from '@/lib/supabase/server';
import { streamDriveFile } from '@/lib/lms/drive/driveLinkSource';
import { logger } from '@/shared/logger';

// Server-side copy of Drive-linked audio, keyed by Drive file id, in a private Supabase Storage
// bucket. Drive itself is slow through the API key (~1.5–2.3 s to first byte on EVERY request and
// ~1 MB/s after that), so streaming a 40 MB lesson straight from Drive on each play meant a long
// wait every time. The first play still streams from Drive (nobody waits on the copy); a background
// fill then stores the file, and every later request is served from Storage through the same
// access-gated route (so the audio stays same-origin for the waveform analyser and the raw
// Drive/Storage location is never exposed).

const BUCKET = 'audio-cache';
/** Bigger files aren't copied (memory-bound fill); they keep streaming from Drive. */
export const MAX_CACHE_BYTES = 200 * 1024 * 1024;

const filling = new Set<string>();
let bucketReady = false;

// Signed read URLs are short-lived; reuse one per file for most of that window instead of paying
// an extra Storage round trip on every range request a media element makes.
const SIGNED_TTL_S = 300;
const signed = new Map<string, { url: string; exp: number }>();

async function signedUrlFor(fileId: string): Promise<string | null> {
  const hit = signed.get(fileId);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUrl(fileId, SIGNED_TTL_S);
  // A missing object is the ordinary "not cached yet" case.
  if (error || !data?.signedUrl) return null;
  signed.set(fileId, { url: data.signedUrl, exp: Date.now() + (SIGNED_TTL_S - 30) * 1000 });
  return data.signedUrl;
}

export interface CachedAudio {
  status: 200 | 206 | 416;
  headers: Record<string, string>;
  body: ReadableStream<Uint8Array>;
}

/** The cached copy (honouring a Range header), or null on a miss / any Storage problem. */
export async function readCachedAudio(fileId: string, range?: { start: number; end?: number }): Promise<CachedAudio | null> {
  try {
    const url = await signedUrlFor(fileId);
    if (!url) return null;
    const res = await fetch(url, { headers: range ? { Range: `bytes=${range.start}-${range.end ?? ''}` } : {}, cache: 'no-store' });
    if (res.status === 416) {
      void res.body?.cancel().catch(() => {});
      return { status: 416, headers: { 'content-range': res.headers.get('content-range') ?? 'bytes */*' }, body: new ReadableStream({ start: (c) => c.close() }) };
    }
    if ((!res.ok && res.status !== 206) || !res.body) {
      signed.delete(fileId);
      void res.body?.cancel().catch(() => {});
      return null;
    }
    const out: Record<string, string> = {};
    for (const h of ['content-type', 'content-length', 'content-range']) {
      const v = res.headers.get(h);
      if (v) out[h] = v;
    }
    out['accept-ranges'] = 'bytes';
    return { status: res.status === 206 ? 206 : 200, headers: out, body: res.body };
  } catch (err) {
    logger.warn({ err, fileId }, 'lms.audio.cache.read_failed');
    return null;
  }
}

async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  const admin = createAdminClient();
  const { error } = await admin.storage.createBucket(BUCKET, { public: false });
  // "already exists" is the normal case after the first ever fill.
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
  bucketReady = true;
}

/**
 * Copies the whole Drive file into Storage. Safe to call on every miss: per-instance de-duped, and
 * the upload is non-upserting, so a concurrent fill on another instance just loses harmlessly.
 * Never throws — a failed fill only means the next request streams from Drive again.
 */
export async function fillAudioCache(fileId: string): Promise<void> {
  if (filling.has(fileId)) return;
  filling.add(fileId);
  const started = Date.now();
  try {
    const stream = await streamDriveFile(fileId);
    const declared = Number(stream.headers['content-length'] ?? 0);
    if (declared > MAX_CACHE_BYTES) {
      await stream.body.cancel();
      logger.info({ fileId, declared }, 'lms.audio.cache.skipped_too_large');
      return;
    }
    const buf = Buffer.from(await new Response(stream.body).arrayBuffer());
    // A truncated download must never become the cached copy.
    if (declared && buf.length !== declared) {
      logger.warn({ fileId, declared, got: buf.length }, 'lms.audio.cache.fill_length_mismatch');
      return;
    }
    await ensureBucket();
    const admin = createAdminClient();
    const { error } = await admin.storage.from(BUCKET).upload(fileId, buf, {
      contentType: stream.headers['content-type'] || 'application/octet-stream',
      upsert: false,
    });
    if (error && !/already exists|duplicate/i.test(error.message)) throw error;
    logger.info({ fileId, bytes: buf.length, ms: Date.now() - started }, 'lms.audio.cache.filled');
  } catch (err) {
    logger.warn({ err, fileId }, 'lms.audio.cache.fill_failed');
  } finally {
    filling.delete(fileId);
  }
}
