// Parsers for the "Insert responsive embed" dialog — each accepts either a
// plain post/video URL or the provider's own copy-paste embed snippet, so
// pasting either shape works instead of only a bare URL.

/** Extracts a YouTube video ID from a watch/short URL, embed URL, or full <iframe> embed snippet. */
export function extractYoutubeEmbedSrc(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const iframeMatch = trimmed.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  const candidate = iframeMatch ? iframeMatch[1] : trimmed;

  const idMatch = candidate.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (!idMatch) return null;

  return `https://www.youtube.com/embed/${idMatch[1]}`;
}

/** Extracts the public post URL from a Facebook post link or a pasted Facebook embed snippet (div or iframe form). */
export function extractFacebookPostUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Facebook's <div class="fb-post" data-href="..."> embed snippet.
  const divMatch = trimmed.match(/data-href=["']([^"']+)["']/i);
  if (divMatch) return divMatch[1].replace(/&amp;/g, '&');

  // Facebook's iframe Page Plugin embed snippet — the post URL is the `href` query param.
  const iframeMatch = trimmed.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  const srcCandidate = iframeMatch ? iframeMatch[1].replace(/&amp;/g, '&') : trimmed;
  try {
    const url = new URL(srcCandidate, 'https://www.facebook.com');
    if (url.hostname.endsWith('facebook.com') && url.pathname.includes('/plugins/post.php')) {
      const href = url.searchParams.get('href');
      if (href) return href;
    }
  } catch {
    // not a URL at all — fall through
  }

  // A plain public Facebook post URL.
  if (/^https?:\/\/(www\.|m\.|web\.)?facebook\.com\//i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/** Loads the Facebook JS SDK at most once per page and re-parses XFBML markup (e.g. a freshly-inserted .fb-post div). */
export function loadFacebookSdkAndParse() {
  if (typeof window === 'undefined') return;

  const w = window as any;
  if (w.FB?.XFBML) {
    w.FB.XFBML.parse();
    return;
  }

  if (!document.getElementById('fb-root')) {
    const root = document.createElement('div');
    root.id = 'fb-root';
    document.body.appendChild(root);
  }

  if (document.getElementById('facebook-jssdk')) return;

  const script = document.createElement('script');
  script.id = 'facebook-jssdk';
  script.async = true;
  script.defer = true;
  script.crossOrigin = 'anonymous';
  script.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0';
  document.body.appendChild(script);
}
