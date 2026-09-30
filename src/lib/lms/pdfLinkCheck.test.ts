import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkPdfLink } from './pdfLinkCheck';

const res = (body: string | null, init: ResponseInit & { headers?: Record<string, string> }) => new Response(body, init);
const mockFetch = (...responses: Response[]) => {
  const fn = vi.fn();
  responses.forEach((r) => fn.mockResolvedValueOnce(r));
  vi.stubGlobal('fetch', fn);
  return fn;
};
afterEach(() => vi.unstubAllGlobals());

describe('checkPdfLink', () => {
  it('accepts application/pdf', async () => {
    mockFetch(res('%PDF-1.7', { status: 206, headers: { 'content-type': 'application/pdf' } }));
    expect(await checkPdfLink('https://example.com/a.pdf')).toEqual({ status: 'ok' });
  });
  it('accepts a generic binary type only when the bytes are a PDF', async () => {
    mockFetch(res('%PDF-1.4 ...', { status: 200, headers: { 'content-type': 'application/octet-stream' } }));
    expect(await checkPdfLink('https://example.com/a')).toEqual({ status: 'ok' });
    mockFetch(res('PK\u0003\u0004zip', { status: 200, headers: { 'content-type': 'application/octet-stream' } }));
    expect(await checkPdfLink('https://example.com/b')).toEqual({ status: 'not_pdf', contentType: 'application/octet-stream' });
  });
  it('reports HTTP errors distinctly', async () => {
    mockFetch(res('nope', { status: 404, headers: { 'content-type': 'text/html' } }));
    expect(await checkPdfLink('https://example.com/missing.pdf')).toEqual({ status: 'http_error', httpStatus: 404 });
  });
  it('reports a non-PDF 200 (e.g. an HTML page) as not_pdf', async () => {
    mockFetch(res('<html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }));
    expect(await checkPdfLink('https://example.com/')).toEqual({ status: 'not_pdf', contentType: 'text/html' });
  });
  it('reports network failure as unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    expect(await checkPdfLink('https://example.com/a.pdf')).toEqual({ status: 'unreachable' });
  });
  it('rejects unsafe URLs without fetching, including via a redirect', async () => {
    const fn = mockFetch();
    expect((await checkPdfLink('http://example.com/a.pdf')).status).toBe('invalid_url');
    expect((await checkPdfLink('https://localhost/a.pdf')).status).toBe('invalid_url');
    expect(fn).not.toHaveBeenCalled();
    mockFetch(res(null, { status: 302, headers: { location: 'https://169.254.169.254/latest' } }));
    expect((await checkPdfLink('https://example.com/r')).status).toBe('invalid_url');
  });
  it('follows a safe redirect', async () => {
    mockFetch(
      res(null, { status: 301, headers: { location: '/real.pdf' } }),
      res('%PDF-', { status: 206, headers: { 'content-type': 'application/pdf' } }),
    );
    expect(await checkPdfLink('https://example.com/old')).toEqual({ status: 'ok' });
  });
});
