// Per-lesson audio cover art (content_blocks.audio_artwork_url). Files go through the shared
// /api/lms/upload endpoint — same bucket (public 'media'), MIME/extension allowlist and size cap
// the Speaker Library uses — under this path prefix. That endpoint accepts many non-image types
// (pdf, zip, video…) under any prefix, so the SAVE step re-checks that the URL is an image this
// workspace itself uploaded to the artwork folder, rather than trusting whatever string arrives.

export const AUDIO_ARTWORK_PATH_PREFIX = 'lms/audio-artwork';
export const AUDIO_ARTWORK_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'] as const;
export const AUDIO_ARTWORK_ACCEPT = 'image/png,image/jpeg,image/webp';
/** Stricter than the upload endpoint's general 25 MB cap — cover art never needs more. */
export const AUDIO_ARTWORK_MAX_BYTES = 10 * 1024 * 1024;

/** Client-side pre-check before uploading (the server remains the real gate). */
export function audioArtworkFileProblem(file: { name: string; type: string; size: number }): string | null {
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  if (!(AUDIO_ARTWORK_EXTENSIONS as readonly string[]).includes(ext) || !file.type.startsWith('image/')) {
    return 'Use a PNG, JPG or WebP image.';
  }
  if (file.size > AUDIO_ARTWORK_MAX_BYTES) return 'That image is over 10 MB — please use a smaller one.';
  return null;
}

/**
 * True only for a URL under `expectedPrefix` (the workspace's public artwork folder URL, ending
 * in "/") naming a single image file directly inside it — no traversal, no sub-folders, no
 * query/fragment, allowed extension only.
 */
export function isOwnedAudioArtworkUrl(url: unknown, expectedPrefix: string): url is string {
  if (typeof url !== 'string' || !expectedPrefix.endsWith('/')) return false;
  if (!url.startsWith(expectedPrefix)) return false;
  const name = url.slice(expectedPrefix.length);
  if (!/^[A-Za-z0-9._-]+$/.test(name) || name.includes('..')) return false;
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  return (AUDIO_ARTWORK_EXTENSIONS as readonly string[]).includes(ext);
}
