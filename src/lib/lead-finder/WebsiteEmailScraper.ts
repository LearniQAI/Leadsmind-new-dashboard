const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const MAILTO_REGEX = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
const ANCHOR_REGEX = /<a\s+[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;

// Assets and platform infrastructure that show up in page markup but are
// never a real business contact address (image CDNs, tracking pixels,
// site-builder boilerplate, schema.org example addresses, etc).
const EXCLUDED_DOMAINS = [
  'sentry.io', 'wixpress.com', 'schema.org', 'godaddy.com', 'example.com',
  'w3.org', 'google.com', 'googleapis.com', 'gstatic.com', 'cloudflare.com',
  'wordpress.org', 'wp.com', 'sentry-next.wixpress.com', 'domain.com',
];
// Placeholder text baked into form markup ("you@yourcompany.com",
// "name@example.org") reads as a real match to the regex but isn't one —
// filter it on the domain, since that's where template placeholders live.
const EXCLUDED_DOMAIN_SUBSTRINGS = ['yourcompany', 'yourdomain', 'youremail', 'placeholder'];
const EXCLUDED_FILE_EXTENSION = /\.(png|jpg|jpeg|gif|svg|webp|css|js|woff|woff2)$/i;

async function fetchPage(url: string, timeoutMs = 4000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadsMindBot/1.0; +https://leadsmind.app)' },
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType && !contentType.includes('html')) return null;

    const html = await response.text();
    return html.slice(0, 300_000); // cap size; this is a page scan, not a mirror
  } catch {
    return null;
  }
}

function isValidCandidate(email: string): boolean {
  if (EXCLUDED_FILE_EXTENSION.test(email)) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  if (EXCLUDED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) return false;
  return !EXCLUDED_DOMAIN_SUBSTRINGS.some((d) => domain.includes(d));
}

function extractEmail(html: string): string | null {
  // mailto: links are the highest-confidence signal — prefer them over a
  // freeform text scan, which is far more prone to matching junk.
  for (const match of html.matchAll(MAILTO_REGEX)) {
    const email = match[1].split('?')[0].toLowerCase();
    if (isValidCandidate(email)) return email;
  }

  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
  const matches = text.match(EMAIL_REGEX) || [];
  for (const candidate of matches) {
    const email = candidate.toLowerCase();
    if (isValidCandidate(email)) return email;
  }

  return null;
}

function findContactLink(html: string, baseUrl: string): string | null {
  for (const match of html.matchAll(ANCHOR_REGEX)) {
    const href = match[1];
    const text = match[2].replace(/<[^>]+>/g, '');
    if (/contact/i.test(href) || /contact/i.test(text)) {
      try {
        return new URL(href, baseUrl).toString();
      } catch {
        continue;
      }
    }
  }
  return null;
}

export class WebsiteEmailScraper {
  /**
   * Best-effort: looks for a real, published email on the business's own
   * site (homepage, then a linked contact page). Returns null on any miss
   * — never guesses a pattern like info@domain, since that's not a found
   * email. Deliberately no headless-browser rendering; a plain GET + regex
   * scan is enough to measure whether scrape-only is worth keeping.
   */
  public static async scrape(website?: string | null): Promise<string | null> {
    if (!website) return null;

    let baseUrl: string;
    try {
      baseUrl = website.startsWith('http') ? website : `https://${website}`;
      new URL(baseUrl);
    } catch {
      return null;
    }

    const homeHtml = await fetchPage(baseUrl);
    if (!homeHtml) return null;

    const homeEmail = extractEmail(homeHtml);
    if (homeEmail) return homeEmail;

    const contactUrl = findContactLink(homeHtml, baseUrl);
    if (!contactUrl) return null;

    const contactHtml = await fetchPage(contactUrl);
    if (!contactHtml) return null;

    return extractEmail(contactHtml);
  }
}
