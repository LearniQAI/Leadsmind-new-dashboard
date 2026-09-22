import type { AudioStorageProvider, ValidationResult, StreamRange, StreamResult } from './storageProvider';
import { extractGoogleDriveFileId } from './googleDriveLinkParser';
import { logger } from '@/shared/logger';

// No OAuth: validation and streaming both go through Drive's public v3 REST API with a
// server-side API key. An API-key-only (unauthenticated) request to files.get can only ever see
// a file that's shared "Anyone with the link" (or fully public) — Drive returns 404, not 403, for
// anything else, which is exactly the "not shared publicly" signal this validates against; there
// is no permissions.list call needed (and none would succeed anyway without OAuth).
const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';

function apiKey(): string {
  const key = process.env.GOOGLE_DRIVE_API_KEY;
  if (!key) throw new Error('GOOGLE_DRIVE_API_KEY is not configured');
  return key;
}

export class GoogleDriveLinkProvider implements AudioStorageProvider {
  parseSourceId(shareUrl: string): string | null {
    return extractGoogleDriveFileId(shareUrl);
  }

  async validate(sourceId: string): Promise<ValidationResult> {
    let res: Response;
    try {
      const url = `${DRIVE_FILES_ENDPOINT}/${encodeURIComponent(sourceId)}?key=${apiKey()}&fields=id,name,mimeType,size`;
      res = await fetch(url);
    } catch (err) {
      logger.error({ err, sourceId }, 'lms.audio.drive.validate.network_failure');
      return { ok: false, error: "Couldn't reach Google Drive to validate this file — try again in a moment." };
    }

    if (res.status === 404) {
      return {
        ok: false,
        error: "This file isn't shared publicly — set sharing to \"Anyone with the link\" and try again.",
      };
    }
    if (!res.ok) {
      logger.error({ status: res.status, sourceId }, 'lms.audio.drive.validate.unexpected_status');
      return { ok: false, error: "Couldn't validate this file with Google Drive — try again in a moment." };
    }

    const data = await res.json().catch(() => null);
    const mimeType: string | null = data?.mimeType ?? null;
    if (!mimeType || !mimeType.startsWith('audio/')) {
      return {
        ok: false,
        error: mimeType
          ? `This file is a "${mimeType}" file, not audio — link an mp3, m4a, or wav file instead.`
          : "This doesn't look like an audio file — link an mp3, m4a, or wav file instead.",
      };
    }

    const sizeRaw = data?.size;
    const sizeBytes = typeof sizeRaw === 'string' ? Number(sizeRaw) : typeof sizeRaw === 'number' ? sizeRaw : null;

    return {
      ok: true,
      metadata: {
        filename: data?.name ?? null,
        mimeType,
        sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : null,
        // Drive v3 has no audio-duration field — filled in later from the player's real
        // loadedmetadata event.
        durationSeconds: null,
      },
    };
  }

  async getStream(sourceId: string, range?: StreamRange): Promise<StreamResult> {
    const url = `${DRIVE_FILES_ENDPOINT}/${encodeURIComponent(sourceId)}?alt=media&key=${apiKey()}`;
    const headers: Record<string, string> = {};
    if (range) {
      headers.Range = `bytes=${range.start}-${range.end ?? ''}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok && res.status !== 206) {
      logger.error({ status: res.status, sourceId }, 'lms.audio.drive.stream.upstream_failure');
      throw new Error(`Drive stream failed with status ${res.status}`);
    }
    if (!res.body) {
      throw new Error('Drive stream returned no body');
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
}

export const googleDriveLinkProvider = new GoogleDriveLinkProvider();
