import { parseDriveFileId, fetchDriveFileMetadata, streamDriveFile, type ByteRange, type DriveStreamResult } from '@/lib/lms/drive/driveLinkSource';

// Video's layer over the shared Drive link source — the Drive calls live in driveLinkSource.ts
// (shared with audio's googleDriveLinkProvider); this file owns only what's video-specific: which
// containers a browser <video> element can actually play, the metadata Drive exposes for video
// (unlike audio, v3 has videoMediaMetadata with a real duration), and the admin-facing copy.

export interface VideoAssetMetadata {
  filename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  /** From Drive's videoMediaMetadata.durationMillis. Drive only fills that in once it has finished
   *  processing an upload, so a freshly uploaded file can validate with this still null. */
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
}

export interface VideoValidationResult {
  ok: boolean;
  metadata?: VideoAssetMetadata;
  /** Actionable, admin-facing — safe to show as-is (never a raw provider/network error). */
  error?: string;
}

// Drive serves the ORIGINAL uploaded file (it does not transcode for alt=media), so what the
// student's browser can play is decided entirely by the uploaded container. MP4 and WebM play
// everywhere; QuickTime .mov usually plays when it holds H.264 (the common case for phone and
// screen recordings), so it's accepted rather than blocking a very common source format.
const PLAYABLE_VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-m4v']);

export function classifyVideoMime(mimeType: string | null): { ok: true } | { ok: false; error: string } {
  if (!mimeType) {
    return { ok: false, error: "This doesn't look like a video file — link an MP4 or WebM file instead." };
  }
  if (PLAYABLE_VIDEO_MIME.has(mimeType)) return { ok: true };
  if (mimeType.startsWith('video/')) {
    return {
      ok: false,
      error: `This is a "${mimeType}" video, which browsers can't play directly — export it as MP4 (H.264) and link that instead.`,
    };
  }
  if (mimeType === 'application/vnd.google-apps.folder') {
    return { ok: false, error: 'This is a Drive folder — open the video inside it and share that file’s link instead.' };
  }
  return { ok: false, error: `This file is a "${mimeType}" file, not a video — link an MP4 or WebM file instead.` };
}

function toNumber(raw: unknown): number | null {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  return Number.isFinite(n) ? n : null;
}

export class GoogleDriveVideoProvider {
  parseSourceId(shareUrl: string): string | null {
    return parseDriveFileId(shareUrl);
  }

  async validate(sourceId: string): Promise<VideoValidationResult> {
    const result = await fetchDriveFileMetadata(sourceId, 'id,name,mimeType,size,videoMediaMetadata');

    if (result.kind === 'network_error') {
      return { ok: false, error: "Couldn't reach Google Drive to validate this file — try again in a moment." };
    }
    if (result.kind === 'not_shared') {
      return {
        ok: false,
        error: "This file isn't shared publicly — set sharing to \"Anyone with the link\" and try again.",
      };
    }
    if (result.kind === 'unexpected_status') {
      return { ok: false, error: "Couldn't validate this file with Google Drive — try again in a moment." };
    }

    const data = result.data;
    const mimeType: string | null = data?.mimeType ?? null;
    const mimeCheck = classifyVideoMime(mimeType);
    if (mimeCheck.ok === false) return { ok: false, error: mimeCheck.error };

    const durationMillis = toNumber(data?.videoMediaMetadata?.durationMillis);

    return {
      ok: true,
      metadata: {
        filename: data?.name ?? null,
        mimeType,
        sizeBytes: toNumber(data?.size),
        durationSeconds: durationMillis !== null ? Math.round(durationMillis / 1000) : null,
        width: toNumber(data?.videoMediaMetadata?.width),
        height: toNumber(data?.videoMediaMetadata?.height),
      },
    };
  }

  async getStream(sourceId: string, range?: ByteRange): Promise<DriveStreamResult> {
    return streamDriveFile(sourceId, range);
  }

  /** Drive's thumbnailLink is short-lived (it expires within hours), so it's never stored — the
   *  poster route asks for a fresh one per request. null when Drive has no thumbnail (yet). */
  async getFreshThumbnailLink(sourceId: string): Promise<string | null> {
    const result = await fetchDriveFileMetadata(sourceId, 'thumbnailLink');
    if (result.kind !== 'ok') return null;
    const link = result.data?.thumbnailLink;
    return typeof link === 'string' && link.startsWith('https://') ? link : null;
  }
}

export const googleDriveVideoProvider = new GoogleDriveVideoProvider();
