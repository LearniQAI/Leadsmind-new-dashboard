// YouTube / Vimeo link parsing and embed-URL building for the website/funnel builder's Video
// widget. Pure (no DOM, no React) so it's unit-testable against real share links.
//
// Links are parsed with URL, never by string splitting: only the video id (and Vimeo's
// unlisted-video hash) is extracted, and the embed URL is rebuilt from scratch, so anything
// else on the pasted link — `?si=` share tracking, `&t=` timestamps, `&feature=share`,
// `?share=copy` — can never leak into (and break) the embed URL.
//
// Player parameters, per each provider's own documentation:
//  - YouTube (developers.google.com/youtube/player_parameters): autoplay, controls and loop are
//    0/1; a single video only loops when `playlist` is set to that same video id. `mute` isn't in
//    that reference but is honoured by the player and is what makes autoplay possible.
//  - Vimeo (help.vimeo.com "Player parameters overview"): autoplay, loop, muted and controls
//    accept 1/0. Hiding controls only takes effect for videos owned by a paid Vimeo plan
//    (Starter and up). Unlisted videos need their privacy hash passed as `h`.

export type VideoRef =
  | { provider: 'youtube'; id: string }
  | { provider: 'vimeo'; id: string; hash?: string };

export interface EmbedOptions {
  autoPlay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d+$/;
const VIMEO_HASH = /^[0-9a-f]{6,}$/i;

function toUrl(input: string): URL | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

const bareHost = (u: URL) => u.hostname.toLowerCase().replace(/^(www\.|m\.|music\.)/, '');

/** The 11-character video id from any YouTube link shape (or a bare id), else null. */
export function parseYouTubeId(input: string): string | null {
  const raw = (input ?? '').trim();
  if (YOUTUBE_ID.test(raw)) return raw;
  const u = toUrl(raw);
  if (!u) return null;
  const host = bareHost(u);
  let id: string | null = null;
  if (host === 'youtu.be') {
    id = u.pathname.split('/')[1] ?? null; // youtu.be/ID?si=...
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v'); // watch?v=ID&t=..., watch?feature=share&v=ID
    else id = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/]+)/)?.[1] ?? null;
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}

/** The numeric id (and unlisted hash, if any) from any Vimeo link shape (or a bare id), else null. */
export function parseVimeo(input: string): { id: string; hash?: string } | null {
  const raw = (input ?? '').trim();
  if (VIMEO_ID.test(raw)) return { id: raw };
  const u = toUrl(raw);
  if (!u) return null;
  const host = bareHost(u);
  if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;
  const segments = u.pathname.split('/').filter(Boolean);
  // The video id is the LAST all-digit path segment (vimeo.com/ID, /ID/HASH,
  // /channels/x/ID, /showcase/x/video/ID, player.vimeo.com/video/ID).
  let idx = -1;
  segments.forEach((s, i) => { if (VIMEO_ID.test(s)) idx = i; });
  if (idx < 0) return null;
  const hash = u.searchParams.get('h') ?? (VIMEO_HASH.test(segments[idx + 1] ?? '') ? segments[idx + 1] : undefined);
  return hash ? { id: segments[idx], hash } : { id: segments[idx] };
}

export function parseVideoUrl(provider: 'youtube' | 'vimeo', input: string): VideoRef | null {
  if (provider === 'youtube') {
    const id = parseYouTubeId(input);
    return id ? { provider, id } : null;
  }
  const v = parseVimeo(input);
  return v ? { provider, ...v } : null;
}

const flag = (b: boolean | undefined) => (b ? '1' : '0');

export function buildEmbedUrl(ref: VideoRef, opts: EmbedOptions): string {
  if (ref.provider === 'youtube') {
    const p = new URLSearchParams({
      autoplay: flag(opts.autoPlay),
      controls: flag(opts.controls),
      mute: flag(opts.muted),
    });
    // A single video only loops if the playlist is itself.
    if (opts.loop) { p.set('loop', '1'); p.set('playlist', ref.id); }
    return `https://www.youtube.com/embed/${ref.id}?${p.toString()}`;
  }
  const p = new URLSearchParams();
  if (ref.hash) p.set('h', ref.hash);
  p.set('autoplay', flag(opts.autoPlay));
  p.set('loop', flag(opts.loop));
  p.set('muted', flag(opts.muted));
  p.set('controls', flag(opts.controls));
  return `https://player.vimeo.com/video/${ref.id}?${p.toString()}`;
}

/** Embed URL for a pasted link, or null when the link isn't a recognisable video link. */
export function videoEmbedUrl(provider: 'youtube' | 'vimeo', input: string, opts: EmbedOptions): string | null {
  const ref = parseVideoUrl(provider, input);
  return ref ? buildEmbedUrl(ref, opts) : null;
}
