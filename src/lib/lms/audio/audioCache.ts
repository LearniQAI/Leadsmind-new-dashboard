import { createDriveMediaCache, type CachedMedia } from '@/lib/lms/drive/driveMediaCache';

// Drive-linked audio's server-side copy — see driveMediaCache.ts for the mechanism.
export const MAX_CACHE_BYTES = 200 * 1024 * 1024;

const cache = createDriveMediaCache({ bucket: 'audio-cache', maxBytes: MAX_CACHE_BYTES, logPrefix: 'lms.audio.cache' });

export type CachedAudio = CachedMedia;
export const readCachedAudio = cache.read;
export const fillAudioCache = cache.fill;
