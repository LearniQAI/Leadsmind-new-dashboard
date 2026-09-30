import { createAdminClient } from '@/lib/supabase/server';
import { streamDriveFile } from '@/lib/lms/drive/driveLinkSource';
import { logger } from '@/shared/logger';

// Server-side copy of Drive-linked media (audio and video), keyed by Drive file id, in a private
// Supabase Storage bucket. Drive is slow through the API key (~1.5–2.3 s to first byte on EVERY
// request and ~1 MB/s after that), so streaming straight from Drive on each play meant a long wait
// every time. The first play still streams from Drive (nobody waits on the copy); a background
// fill then stores the file, and every later request — from any student — is served from Storage
// THROUGH THE SAME ACCESS-GATED ROUTE, so it stays same-origin and the raw Drive/Storage location
// is never exposed. Audio and video each get their own bucket and size bound.

export interface DriveMediaCacheOptions {
  bucket: string;
  /** Bigger files aren't copied (the fill is memory-bound); they keep streaming from Drive. */
  maxBytes: number;
  /** Log-event prefix, e.g. 'lms.audio.cache'. */
  logPrefix: string;
}

export interface CachedMedia {
  status: 200 | 206 | 416;
  headers: Record<string, string>;
  body: ReadableStream<Uint8Array>;
}

// A fill that died mid-way must not block every future fill: a lock older than this is stale.
const LOCK_TTL_MS = 15 * 60 * 1000;
// Signed read URLs are short-lived; reuse one per file for most of that window instead of paying
// an extra Storage round trip on every range request a media element makes.
const SIGNED_TTL_S = 300;

export function createDriveMediaCache({ bucket, maxBytes, logPrefix }: DriveMediaCacheOptions) {
  const filling = new Set<string>();
  const signed = new Map<string, { url: string; exp: number }>();
  let bucketReady = false;

  async function signedUrlFor(fileId: string): Promise<string | null> {
    const hit = signed.get(fileId);
    if (hit && hit.exp > Date.now()) return hit.url;
    const { data, error } = await createAdminClient().storage.from(bucket).createSignedUrl(fileId, SIGNED_TTL_S);
    // A missing object is the ordinary "not cached yet" case.
    if (error || !data?.signedUrl) return null;
    signed.set(fileId, { url: data.signedUrl, exp: Date.now() + (SIGNED_TTL_S - 30) * 1000 });
    return data.signedUrl;
  }

  /** The cached copy (honouring a Range), or null on a miss / any Storage problem. */
  async function read(fileId: string, range?: { start: number; end?: number }): Promise<CachedMedia | null> {
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
      logger.warn({ err, fileId }, `${logPrefix}.read_failed`);
      return null;
    }
  }

  async function ensureBucket(): Promise<void> {
    if (bucketReady) return;
    const { error } = await createAdminClient().storage.createBucket(bucket, { public: false });
    // "already exists" is the normal case after the first ever fill.
    if (error && !/already exists|duplicate/i.test(error.message)) throw error;
    bucketReady = true;
  }

  /**
   * Cross-instance mutex. A first play makes MANY range requests, each of which can land on a
   * different serverless instance and each of which sees a miss; without this every one of them
   * would start its own full download of a possibly-hundreds-of-MB file. Creating the lock object
   * without upsert is atomic: exactly one caller succeeds.
   */
  async function acquireLock(fileId: string, retried = false): Promise<boolean> {
    const admin = createAdminClient();
    const lockPath = `${fileId}.lock`;
    const { error } = await admin.storage.from(bucket).upload(lockPath, new Blob([String(Date.now())]), { upsert: false, contentType: 'text/plain' });
    if (!error) return true;
    if (!/already exists|duplicate/i.test(error.message)) return true; // Storage trouble: don't let the mutex itself block a fill
    if (retried) return false;
    const { data } = await admin.storage.from(bucket).list('', { search: lockPath, limit: 5 });
    const existing = data?.find((o) => o.name === lockPath);
    if (existing?.created_at && Date.now() - Date.parse(existing.created_at) > LOCK_TTL_MS) {
      await admin.storage.from(bucket).remove([lockPath]);
      return acquireLock(fileId, true);
    }
    return false; // another instance is already filling
  }

  /**
   * Copies the whole Drive file into Storage. Safe to call on every miss: per-instance de-duped,
   * cross-instance locked, and the upload is non-upserting. Never throws — a failed fill only
   * means the next request streams from Drive again.
   */
  async function fill(fileId: string): Promise<void> {
    if (filling.has(fileId)) return;
    filling.add(fileId);
    const started = Date.now();
    let locked = false;
    try {
      await ensureBucket();
      locked = await acquireLock(fileId);
      if (!locked) return;
      // A request that missed just before another fill finished lands here: don't download again.
      if (await signedUrlFor(fileId)) return;

      const stream = await streamDriveFile(fileId);
      const declared = Number(stream.headers['content-length'] ?? 0);
      if (declared > maxBytes) {
        await stream.body.cancel();
        logger.info({ fileId, declared, maxBytes }, `${logPrefix}.skipped_too_large`);
        return;
      }
      const buf = Buffer.from(await new Response(stream.body).arrayBuffer());
      // A truncated download must never become the cached copy.
      if (declared && buf.length !== declared) {
        logger.warn({ fileId, declared, got: buf.length }, `${logPrefix}.fill_length_mismatch`);
        return;
      }
      const admin = createAdminClient();
      const { error } = await admin.storage.from(bucket).upload(fileId, buf, {
        contentType: stream.headers['content-type'] || 'application/octet-stream',
        upsert: false,
      });
      if (error && !/already exists|duplicate/i.test(error.message)) throw error;
      logger.info({ fileId, bytes: buf.length, ms: Date.now() - started }, `${logPrefix}.filled`);
    } catch (err) {
      logger.warn({ err, fileId }, `${logPrefix}.fill_failed`);
    } finally {
      if (locked) await createAdminClient().storage.from(bucket).remove([`${fileId}.lock`]).catch(() => {});
      filling.delete(fileId);
    }
  }

  return { read, fill };
}
