// PRD Section 29's storage abstraction: this interface is what lets a future move to
// Cloudflare R2/S3 (or a real OAuth-based Drive integration) happen without the player or the
// content-block editor ever knowing. GoogleDriveLinkProvider is the only implementation for
// Phase 1.

export interface AudioAssetMetadata {
  filename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  /** Google Drive's v3 API exposes no audio-duration field (unlike videoMediaMetadata for
   *  video) — this stays null from validation and is filled in later from the player's own
   *  loadedmetadata event on first real playback. */
  durationSeconds: number | null;
}

export interface ValidationResult {
  ok: boolean;
  metadata?: AudioAssetMetadata;
  /** Actionable, admin-facing — safe to show as-is (never a raw provider/network error). */
  error?: string;
}

export interface StreamRange {
  start: number;
  end?: number;
}

export interface StreamResult {
  status: 200 | 206 | 416;
  headers: Record<string, string>;
  body: ReadableStream<Uint8Array>;
}

export interface AudioStorageProvider {
  /** Extracts this provider's source id from a pasted share link, or null if unrecognized. */
  parseSourceId(shareUrl: string): string | null;
  /** Confirms the source is publicly accessible and is actually audio; fetches what metadata
   *  the provider can offer without playing the file. */
  validate(sourceId: string): Promise<ValidationResult>;
  /** Proxies the actual bytes, honoring an optional byte range for scrubbing. */
  getStream(sourceId: string, range?: StreamRange): Promise<StreamResult>;
}
