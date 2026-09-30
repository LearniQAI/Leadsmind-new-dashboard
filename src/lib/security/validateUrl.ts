import dns from 'node:dns';
import https from 'node:https';
import net from 'node:net';
import { Readable } from 'node:stream';

export class UrlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UrlValidationError';
  }
}

// ---------------------------------------------------------------------------------------------
// IP classification
// ---------------------------------------------------------------------------------------------

/** [network, prefixLength] pairs that must never be reached from a server-side fetch. */
const BLOCKED_V4: [string, number][] = [
  ['0.0.0.0', 8], // "this network" / unspecified
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, incl. the 169.254.169.254 cloud metadata service
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved + broadcast
];

const v4ToInt = (ip: string): number => ip.split('.').reduce((acc, o) => acc * 256 + Number(o), 0);

function isBlockedV4(ip: string): boolean {
  const n = v4ToInt(ip);
  return BLOCKED_V4.some(([net_, bits]) => {
    const base = v4ToInt(net_);
    const size = 2 ** (32 - bits);
    return n >= base && n < base + size;
  });
}

/** IPv6 text → 16 bytes, or null if it isn't a valid address. Handles `::` and embedded dotted quads. */
function parseV6(input: string): number[] | null {
  let ip = input.replace(/^\[|\]$/g, '');
  const zone = ip.indexOf('%');
  if (zone !== -1) ip = ip.slice(0, zone);
  if (!net.isIPv6(ip)) return null;

  let tail: number[] = [];
  const dotted = ip.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const o = dotted[1].split('.').map(Number);
    tail = [o[0], o[1], o[2], o[3]];
    ip = ip.slice(0, ip.length - dotted[1].length) + '0:0';
  }
  const [headStr, tailStr] = ip.split('::');
  const toWords = (s: string) => (s ? s.split(':').map((h) => parseInt(h, 16)) : []);
  const head = toWords(headStr);
  const rest = tailStr === undefined ? [] : toWords(tailStr);
  const words = tailStr === undefined ? head : [...head, ...Array(8 - head.length - rest.length).fill(0), ...rest];
  if (words.length !== 8) return null;
  const bytes = words.flatMap((w) => [(w >> 8) & 0xff, w & 0xff]);
  if (tail.length) bytes.splice(12, 4, ...tail);
  return bytes;
}

const startsWith = (b: number[], prefix: number[]) => prefix.every((v, i) => b[i] === v);

function isBlockedV6(ip: string): boolean {
  const b = parseV6(ip);
  if (!b) return true; // unparseable → refuse rather than guess
  if (b.every((x) => x === 0)) return true; // ::
  if (b.slice(0, 15).every((x) => x === 0) && b[15] === 1) return true; // ::1
  // IPv4 embedded in IPv6: judge the embedded IPv4 address, otherwise ::ffff:169.254.169.254 sails through.
  const v4 = (o: number) => `${b[o]}.${b[o + 1]}.${b[o + 2]}.${b[o + 3]}`;
  if (b.slice(0, 10).every((x) => x === 0) && b[10] === 0xff && b[11] === 0xff) return isBlockedV4(v4(12)); // ::ffff:a.b.c.d
  if (b.slice(0, 12).every((x) => x === 0)) return isBlockedV4(v4(12)); // ::a.b.c.d (deprecated compat)
  if (startsWith(b, [0x00, 0x64, 0xff, 0x9b, 0, 0, 0, 0, 0, 0, 0, 0])) return isBlockedV4(v4(12)); // 64:ff9b::/96 NAT64
  if (b[0] === 0x20 && b[1] === 0x02) return isBlockedV4(v4(2)); // 2002::/16 6to4
  if ((b[0] & 0xfe) === 0xfc) return true; // fc00::/7 unique local
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true; // fe80::/10 link-local
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0xc0) return true; // fec0::/10 site-local (deprecated)
  if (b[0] === 0xff) return true; // ff00::/8 multicast
  if (startsWith(b, [0x20, 0x01, 0x0d, 0xb8])) return true; // 2001:db8::/32 documentation
  if (startsWith(b, [0x01, 0x00, 0, 0, 0, 0, 0, 0])) return true; // 100::/64 discard-only
  return false;
}

/** True when a literal IP address must not be fetched (private, loopback, link-local, metadata, …). */
export function isBlockedIp(ip: string): boolean {
  const bare = ip.replace(/^\[|\]$/g, '');
  if (net.isIPv4(bare)) return isBlockedV4(bare);
  if (net.isIPv6(bare)) return isBlockedV6(bare);
  return true; // not an IP at all
}

// ---------------------------------------------------------------------------------------------
// Text-level URL validation (synchronous)
// ---------------------------------------------------------------------------------------------

const BLOCKED_HOSTS = new Set(['localhost', 'localhost.', 'metadata.google.internal', 'metadata.google.internal.']);

/**
 * Validates a user-supplied URL's *text*: scheme, host name and literal IPs. This alone cannot
 * stop DNS rebinding (a public-looking name can resolve to an internal address), so every
 * server-side fetch of a user-supplied URL must go through {@link safeFetch}, which also resolves
 * and pins the address. Kept synchronous for callers that only need the parsed URL.
 *
 * @throws UrlValidationError if URL is invalid or points to a private/internal network
 */
export function validateExternalUrl(url: string): URL {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new UrlValidationError('Invalid URL format');
  }

  if (parsed.protocol !== 'https:') {
    throw new UrlValidationError('Only HTTPS URLs are permitted');
  }
  if (parsed.username || parsed.password) {
    throw new UrlValidationError('URLs with embedded credentials are not permitted');
  }

  const host = parsed.hostname.toLowerCase();
  const bare = host.replace(/^\[|\]$/g, '');

  if (bare === '169.254.169.254' || host === 'metadata.google.internal' || host === 'metadata.google.internal.') {
    throw new UrlValidationError('Cloud metadata endpoints are not permitted');
  }
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.localhost') || host.endsWith('.localhost.')) {
    throw new UrlValidationError('Localhost URLs are not permitted');
  }
  // The URL parser has already normalised decimal / hex / octal IPv4 spellings to dotted form.
  if (net.isIP(bare) && isBlockedIp(bare)) {
    throw new UrlValidationError('Private IP addresses are not permitted');
  }

  return parsed;
}

// ---------------------------------------------------------------------------------------------
// Resolve → validate → pin (DNS-rebinding-safe fetch)
// ---------------------------------------------------------------------------------------------

/** Every address the name resolves to (A + AAAA). Injectable for tests. */
export type ResolveAll = (hostname: string) => Promise<string[]>;

const defaultResolveAll: ResolveAll = async (hostname) => {
  const results = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  return results.map((r) => r.address);
};

/** One HTTPS request that connects to `address` (never re-resolving `url.hostname`). Injectable for tests. */
export type PinnedRequest = (url: URL, init: SafeFetchInit, address: string) => Promise<Response>;

export interface SafeFetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Uint8Array;
  signal?: AbortSignal;
  /** Redirect hops to follow (each one fully re-validated). Default 5. */
  maxRedirects?: number;
}

export interface SafeFetchDeps {
  resolveAll?: ResolveAll;
  request?: PinnedRequest;
}

const NO_BODY_STATUS = new Set([101, 204, 205, 304]);

/**
 * The real transport. The socket is opened to the already-validated `address` via a fixed
 * `lookup`, so the HTTP stack performs no second DNS resolution that an attacker could answer
 * differently. `Host` and TLS SNI/certificate verification still use the original hostname, so
 * the request reaches the right virtual host and TLS still validates the real name.
 */
const pinnedHttpsRequest: PinnedRequest = (url, init, address) =>
  new Promise<Response>((resolve, reject) => {
    const family = net.isIPv6(address) ? 6 : 4;
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    const req = https.request(
      {
        host: hostname,
        port: url.port ? Number(url.port) : 443,
        path: `${url.pathname}${url.search}`,
        method: init.method ?? 'GET',
        headers: {
          // Bodies are not decompressed here, so ask for none.
          'Accept-Encoding': 'identity',
          ...init.headers,
        },
        // Fixed answer: the pinned, validated address. `all` is requested by Node's happy-eyeballs.
        lookup: ((_h: string, opts: { all?: boolean }, cb: (...a: any[]) => void) =>
          opts?.all ? cb(null, [{ address, family }]) : cb(null, address, family)) as any,
        // SNI must be a name, never an IP literal.
        servername: net.isIP(hostname) ? undefined : hostname,
        signal: init.signal,
      },
      (res) => {
        const headers = new Headers();
        for (const [k, v] of Object.entries(res.headers)) {
          if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
          else if (v !== undefined) headers.set(k, v);
        }
        const status = res.statusCode ?? 0;
        const body = NO_BODY_STATUS.has(status) ? null : (Readable.toWeb(res) as unknown as ReadableStream<Uint8Array>);
        if (!body) res.resume();
        resolve(new Response(body, { status, statusText: res.statusMessage, headers }));
      },
    );
    req.on('error', reject);
    if (init.body !== undefined) req.write(init.body);
    req.end();
  });

/**
 * Resolves `url`'s host, rejects if ANY returned address is disallowed, and returns the addresses
 * to connect to. IP-literal hosts are checked directly (they never hit DNS).
 */
async function resolveValidated(url: URL, resolveAll: ResolveAll): Promise<string[]> {
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) return [host]; // already vetted by validateExternalUrl
  let addresses: string[];
  try {
    addresses = await resolveAll(host);
  } catch {
    throw new UrlValidationError('Could not resolve host');
  }
  if (addresses.length === 0) throw new UrlValidationError('Could not resolve host');
  // "Any bad answer rejects" — a name that also returns an internal address is treated as hostile.
  if (addresses.some(isBlockedIp)) {
    throw new UrlValidationError('URL resolves to a private or internal address');
  }
  return addresses;
}

/**
 * fetch() for user-supplied URLs. For the initial URL AND every redirect hop it (1) validates the
 * URL text, (2) resolves the host itself and rejects if any address is private/loopback/link-local/
 * metadata, and (3) connects to that exact validated address (see pinnedHttpsRequest).
 * Redirects are followed here, never by the HTTP client. Non-network failures throw
 * {@link UrlValidationError}; transport failures throw as a normal fetch would.
 */
export async function safeFetch(rawUrl: string | URL, init: SafeFetchInit = {}, deps: SafeFetchDeps = {}): Promise<Response> {
  const resolveAll = deps.resolveAll ?? defaultResolveAll;
  const request = deps.request ?? pinnedHttpsRequest;
  const maxRedirects = init.maxRedirects ?? 5;

  let url = validateExternalUrl(rawUrl.toString());
  let method = init.method ?? 'GET';
  let body = init.body;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const addresses = await resolveValidated(url, resolveAll);

    let res: Response | undefined;
    let lastErr: unknown;
    for (const address of addresses) {
      try {
        res = await request(url, { ...init, method, body }, address);
        break;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') throw err;
        lastErr = err; // connection-level failure: try the next validated address
      }
    }
    if (!res) throw lastErr ?? new Error('Connection failed');

    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      void res.body?.cancel().catch(() => {});
      // Each hop is validated from scratch: text, then a fresh resolution, then a fresh pin.
      url = validateExternalUrl(new URL(location, url).toString());
      // Same method semantics as fetch: 303 (and 301/302 for POST) become a body-less GET.
      if (res.status === 303 || ((res.status === 301 || res.status === 302) && method === 'POST')) {
        method = 'GET';
        body = undefined;
      }
      continue;
    }
    return res;
  }
  throw new UrlValidationError('Too many redirects');
}
