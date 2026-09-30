import { createDriveMediaCache } from '@/lib/lms/drive/driveMediaCache';

// Drive-linked video's server-side copy — see driveMediaCache.ts for the mechanism.
//
// Bound: 200 MB. Measured against the workspace's real video assets: everything except one 433 MB
// file is 6–57 MB, so the bound covers the practical library. The fill buffers the file in memory,
// so a 400+ MB lecture is deliberately left streaming from Drive (it is still browser-cacheable)
// rather than risking the function running out of memory or time.
export const MAX_VIDEO_CACHE_BYTES = 200 * 1024 * 1024;

const cache = createDriveMediaCache({ bucket: 'video-cache', maxBytes: MAX_VIDEO_CACHE_BYTES, logPrefix: 'lms.video.cache' });

export const readCachedVideo = cache.read;
export const fillVideoCache = cache.fill;
