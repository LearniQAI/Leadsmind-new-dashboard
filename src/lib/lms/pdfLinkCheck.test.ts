import { describe, it, expect, vi } from 'vitest';
import { checkPdfLink } from './pdfLinkCheck';
import type { PinnedRequest, SafeFetchDeps } from '@/lib/security/validateUrl';

// The check goes through safeFetch (DNS resolve + pin + per-hop validation). Tests stand in for
// DNS and the network via its injectable deps; every host here "resolves" to a public address.
const res = (body: string | null, init: ResponseInit & { headers?: Record<string, string> }) => new Response(body, init);
const publicDns = async () => ['93.184.216.34'];
const deps = (...responses: Response[]): { deps: SafeFetchDeps; request: ReturnType<typeof vi.fn> } => {
  const request = vi.fn<PinnedRequest>();
  responses.forEach((r) => request.mockResolvedValueOnce(r));
  return { deps: { resolveAll: publicDns, request }, request };
};

describe('checkPdfLink', () => {
  it('accepts application/pdf', async () => {
    const { deps: d } = deps(res('%PDF-1.7', { status: 206, headers: { 'content-type': 'application/pdf' } }));
    expect(await checkPdfLink('https://example.com/a.pdf', d)).toEqual({ status: 'ok' });
  });
  it('accepts a generic binary type only when the bytes are a PDF', async () => {
    const pdfBytes = deps(res('%PDF-1.4 ...', { status: 200, headers: { 'content-type': 'application/octet-stream' } }));
    expect(await checkPdfLink('https://example.com/a', pdfBytes.deps)).toEqual({ status: 'ok' });
    const zipBytes = deps(res('PK\u0003\u0004zip', { status: 200, headers: { 'content-type': 'application/octet-stream' } }));
    expect(await checkPdfLink('https://example.com/b', zipBytes.deps)).toEqual({ status: 'not_pdf', contentType: 'application/octet-stream' });
  });
  it('reports HTTP errors distinctly', async () => {
    const d = deps(res('nope', { status: 404, headers: { 'content-type': 'text/html' } }));
    expect(await checkPdfLink('https://example.com/missing.pdf', d.deps)).toEqual({ status: 'http_error', httpStatus: 404 });
  });
  it('reports a non-PDF 200 (e.g. an HTML page) as not_pdf', async () => {
    const d = deps(res('<html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }));
    expect(await checkPdfLink('https://example.com/', d.deps)).toEqual({ status: 'not_pdf', contentType: 'text/html' });
  });
  it('reports network failure as unreachable', async () => {
    const request = vi.fn<PinnedRequest>().mockRejectedValue(new TypeError('fetch failed'));
    expect(await checkPdfLink('https://example.com/a.pdf', { resolveAll: publicDns, request })).toEqual({ status: 'unreachable' });
  });
  it('rejects unsafe URLs without connecting: bad scheme, localhost, a redirect, and a DNS answer', async () => {
    const none = deps();
    expect((await checkPdfLink('http://example.com/a.pdf', none.deps)).status).toBe('invalid_url');
    expect((await checkPdfLink('https://localhost/a.pdf', none.deps)).status).toBe('invalid_url');
    expect(none.request).not.toHaveBeenCalled();

    const redirected = deps(res(null, { status: 302, headers: { location: 'https://169.254.169.254/latest' } }));
    expect((await checkPdfLink('https://example.com/r', redirected.deps)).status).toBe('invalid_url');

    // A public-looking name whose DNS answer is the metadata address (rebinding).
    const rebind = deps();
    const r = await checkPdfLink('https://rebinder.example.com/a.pdf', { resolveAll: async () => ['169.254.169.254'], request: rebind.request as any });
    expect(r.status).toBe('invalid_url');
    expect(rebind.request).not.toHaveBeenCalled();
  });
  it('follows a safe redirect', async () => {
    const { deps: d } = deps(
      res(null, { status: 301, headers: { location: '/real.pdf' } }),
      res('%PDF-', { status: 206, headers: { 'content-type': 'application/pdf' } }),
    );
    expect(await checkPdfLink('https://example.com/old', d)).toEqual({ status: 'ok' });
  });
});
