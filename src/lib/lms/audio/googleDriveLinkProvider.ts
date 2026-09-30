import type { AudioStorageProvider, ValidationResult, StreamRange, StreamResult } from './storageProvider';
import {
  parseDriveFileId,
  fetchDriveFileMetadata,
  streamDriveFile,
  DriveStreamError,
  type DriveFailureCode,
} from '@/lib/lms/drive/driveLinkSource';

const DRIVE_PROBE_COPY: Record<DriveFailureCode, string> = {
  not_shared: "This file isn't shared publicly — set sharing to \"Anyone with the link\" and try again.",
  quota: 'Google Drive has temporarily blocked downloads of this file (download quota reached). Try again later, or upload the file instead.',
  forbidden: 'Google Drive refuses to serve this file\'s content — the owner may have disabled downloading. Enable downloads or upload the file instead.',
  not_media: "Google Drive returned a web page instead of the audio — try uploading the file instead.",
  timeout: "Google Drive didn't respond in time — try again in a moment.",
  upstream: "Couldn't read this file's audio from Google Drive — try again in a moment.",
};

// Audio's layer over the shared Drive link source (src/lib/lms/drive/driveLinkSource.ts): the
// Drive calls themselves live there (shared with video); this file owns only what's audio-specific
// — the audio/* MIME rule and the admin-facing copy.
export class GoogleDriveLinkProvider implements AudioStorageProvider {
  parseSourceId(shareUrl: string): string | null {
    return parseDriveFileId(shareUrl);
  }

  async validate(sourceId: string): Promise<ValidationResult> {
    const result = await fetchDriveFileMetadata(sourceId, 'id,name,mimeType,size');

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
    if (!mimeType || !mimeType.startsWith('audio/')) {
      return {
        ok: false,
        error: mimeType
          ? `This file is a "${mimeType}" file, not audio — link an mp3, m4a, or wav file instead.`
          : "This doesn't look like an audio file — link an mp3, m4a, or wav file instead.",
      };
    }

    // Metadata says the file exists and is shared; it says nothing about whether its BYTES can be
    // fetched, which is what playback needs. Fetch one real byte through the same call playback
    // uses, so "Ready" can't disagree with the player.
    try {
      const probe = await streamDriveFile(sourceId, { start: 0, end: 0 });
      await probe.body.cancel();
    } catch (err) {
      if (err instanceof DriveStreamError) return { ok: false, error: DRIVE_PROBE_COPY[err.code] };
      throw err;
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
    return streamDriveFile(sourceId, range);
  }
}

export const googleDriveLinkProvider = new GoogleDriveLinkProvider();
