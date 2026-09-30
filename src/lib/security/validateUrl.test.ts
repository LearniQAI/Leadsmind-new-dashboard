import { describe, it, expect, vi } from 'vitest';
import { isBlockedIp, validateExternalUrl, safeFetch, UrlValidationError, type PinnedRequest, type ResolveAll } from './validateUrl';

const ok = (body = '') => new Response(body, { status: 200 });
const redirect = (to: string) => new Response(null, { status: 302, headers: { location: to } });

/** Fake DNS: host → answer sets; each call for a host returns its next answer set (the last repeats). */
const dnsFor = (table: Record<string, string[][]>): { resolveAll: ResolveAll; calls: string[] } => {
  const calls: string[] = [];
  const idx: Record<string, number> = {};
  return {
    calls,
    resolveAll: async (host) => {
      calls.push(host);
      const answers = table[host];
      if (!answers) throw new Error('ENOTFOUND');
      const i = Math.min(idx[host] ?? 0, answers.length - 1);
      idx[host] = i + 1;
      return answers[i];
    },
  };
};

describe('isBlockedIp', () => {
  it.each([
    '127.0.0.1', '127.9.9.9', '10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254',
    '0.0.0.0', '100.64.0.1', '224.0.0.1', '255.255.255.255', '198.18.0.1',
    '::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1', 'ff02::1',
    '::ffff:169.254.169.254', '::ffff:127.0.0.1', '::ffff:10.1.2.3', '64:ff9b::a00:1', '2002:7f00:1::1',
  ])('blocks %s', (ip) => expect(isBlockedIp(ip)).toBe(true));

  it.each(['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.32.0.1', '172.15.255.255', '2606:4700:4700::1111', '::ffff:8.8.8.8'])(
    'allows public %s',
    (ip) => expect(isBlockedIp(ip)).toBe(false),
  );
});

describe('validateExternalUrl (text checks)', () => {
  it('rejects non-https, credentials, localhost forms and literal internal IPs', () => {
    for (const u of [
      'http://example.com/', 'https://user:pw@example.com/', 'https://localhost/', 'https://foo.localhost/',
      'https://127.0.0.1/', 'https://[::1]/', 'https://[::ffff:169.254.169.254]/',
      'https://metadata.google.internal/', 'https://2130706433/', 'https://0x7f.1/',
    ]) {
      expect(() => validateExternalUrl(u), u).toThrow(UrlValidationError);
    }
  });
  it('accepts an ordinary public URL', () => {
    expect(validateExternalUrl('https://example.com/a.pdf').hostname).toBe('example.com');
  });
});

describe('safeFetch — resolve, validate, pin', () => {
  it('passes a host resolving to a public IP and connects to exactly that IP', async () => {
    const dns = dnsFor({ 'files.example.com': [['93.184.216.34']] });
    const request = vi.fn<PinnedRequest>().mockResolvedValue(ok('pdf'));
    const res = await safeFetch('https://files.example.com/a.pdf', {}, { resolveAll: dns.resolveAll, request });
    expect(await res.text()).toBe('pdf');
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][2]).toBe('93.184.216.34'); // pinned address
    expect(request.mock.calls[0][0].hostname).toBe('files.example.com'); // Host/SNI stay the real name
  });

  it.each([
    ['loopback', '127.0.0.1'],
    ['cloud metadata', '169.254.169.254'],
    ['private RFC1918', '10.0.0.7'],
    ['IPv4-mapped metadata', '::ffff:169.254.169.254'],
    ['IPv6 loopback', '::1'],
  ])('rejects a hostname that resolves directly to %s, without connecting', async (_label, ip) => {
    const dns = dnsFor({ 'evil.example.com': [[ip]] });
    const request = vi.fn<PinnedRequest>();
    await expect(safeFetch('https://evil.example.com/x', {}, { resolveAll: dns.resolveAll, request })).rejects.toThrow(/private or internal/);
    expect(request).not.toHaveBeenCalled();
  });

  it('rejects when ANY returned address is internal (mixed public + private answers)', async () => {
    const dns = dnsFor({ 'mixed.example.com': [['93.184.216.34', '10.0.0.9']] });
    const request = vi.fn<PinnedRequest>();
    await expect(safeFetch('https://mixed.example.com/', {}, { resolveAll: dns.resolveAll, request })).rejects.toThrow(UrlValidationError);
    expect(request).not.toHaveBeenCalled();
  });

  it('rejects a redirect from a public-resolving host to a private-resolving one at the hop check', async () => {
    const dns = dnsFor({ 'public.example.com': [['93.184.216.34']], 'internal.example.net': [['169.254.169.254']] });
    const request = vi.fn<PinnedRequest>().mockResolvedValueOnce(redirect('https://internal.example.net/latest/meta-data'));
    await expect(safeFetch('https://public.example.com/r', {}, { resolveAll: dns.resolveAll, request })).rejects.toThrow(/private or internal/);
    expect(request).toHaveBeenCalledTimes(1); // the initial hop only: never connected to the internal host
  });

  it('rejects a redirect straight to an internal IP literal', async () => {
    const dns = dnsFor({ 'public.example.com': [['93.184.216.34']] });
    const request = vi.fn<PinnedRequest>().mockResolvedValueOnce(redirect('https://169.254.169.254/latest'));
    await expect(safeFetch('https://public.example.com/r', {}, { resolveAll: dns.resolveAll, request })).rejects.toThrow(UrlValidationError);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('rebinding: an answer that flips to internal on a later lookup is never used to connect', async () => {
    // First resolution: public. Any later resolution of the same name: the metadata IP.
    const dns = dnsFor({ 'rebind.example.com': [['93.184.216.34'], ['169.254.169.254']] });
    const request = vi.fn<PinnedRequest>().mockResolvedValue(ok('fine'));
    await safeFetch('https://rebind.example.com/a.pdf', {}, { resolveAll: dns.resolveAll, request });
    expect(dns.calls).toEqual(['rebind.example.com']); // resolved once; the transport must not resolve again
    expect(request.mock.calls[0][2]).toBe('93.184.216.34'); // and it connected to the validated address
  });

  it('re-resolves and re-validates each hop (a name reused on a later hop is checked afresh)', async () => {
    const dns = dnsFor({ 'a.example.com': [['93.184.216.34']], 'b.example.com': [['93.184.216.35'], ['10.0.0.1']] });
    const request = vi.fn<PinnedRequest>()
      .mockResolvedValueOnce(redirect('https://b.example.com/1'))
      .mockResolvedValueOnce(redirect('https://b.example.com/2'));
    await expect(safeFetch('https://a.example.com/', {}, { resolveAll: dns.resolveAll, request })).rejects.toThrow(/private or internal/);
    expect(dns.calls).toEqual(['a.example.com', 'b.example.com', 'b.example.com']);
  });

  it('follows a safe redirect and stops after too many', async () => {
    const dns = dnsFor({ 'a.example.com': [['93.184.216.34']] });
    const good = vi.fn<PinnedRequest>().mockResolvedValueOnce(redirect('/next')).mockResolvedValueOnce(ok('done'));
    expect(await (await safeFetch('https://a.example.com/', {}, { resolveAll: dns.resolveAll, request: good })).text()).toBe('done');
    const loop = vi.fn<PinnedRequest>().mockImplementation(async () => redirect('/again'));
    await expect(safeFetch('https://a.example.com/', { maxRedirects: 3 }, { resolveAll: dns.resolveAll, request: loop })).rejects.toThrow(/Too many redirects/);
  });

  it('rejects unresolvable hosts as a validation error', async () => {
    const dns = dnsFor({});
    await expect(safeFetch('https://nope.example.com/', {}, { resolveAll: dns.resolveAll, request: vi.fn() })).rejects.toThrow(/resolve/);
  });
});
