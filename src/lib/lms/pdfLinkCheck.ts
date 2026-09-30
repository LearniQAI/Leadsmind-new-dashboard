import { validateExternalUrl, UrlValidationError } from '@/lib/security/validateUrl';

// Server-side check that a pasted link really serves a PDF. Each outcome is distinct so the editor
// can say exactly what is wrong instead of a generic "invalid link".
export type PdfCheck =
  | { status: 'ok' }
  | { status: 'invalid_url'; reason: string }
  | { status: 'unreachable' }
  | { status: 'http_error'; httpStatus: number }
  | { status: 'not_pdf'; contentType: string | null };

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 10_000;
const PDF_MAGIC = '%PDF-';
// Hosts often serve PDFs as a generic binary type; those are only accepted when the bytes prove it.
const GENERIC_BINARY = /^(application\/(octet-stream|binary|download|x-download)|binary\/octet-stream)$/i;

/** GET with manual redirects so EVERY hop goes through the SSRF guard, not just the pasted URL. */
async function fetchFollowing(start: URL, init: RequestInit): Promise<Response> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) });
    const loc = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && loc) {
      void res.body?.cancel().catch(() => {});
      url = validateExternalUrl(new URL(loc, url).toString());
      continue;
    }
    return res;
  }
  throw new UrlValidationError('Too many redirects');
}

const baseType = (h: string | null) => (h ? h.split(';')[0].trim().toLowerCase() : null);

export async function checkPdfLink(rawUrl: string): Promise<PdfCheck> {
  let url: URL;
  try {
    url = validateExternalUrl(rawUrl.trim());
  } catch (e) {
    return { status: 'invalid_url', reason: e instanceof UrlValidationError ? e.message : 'Invalid URL format' };
  }

  try {
    // A 1 KB ranged GET (not HEAD): many PDF hosts reject or mis-answer HEAD, and it lets us read
    // the magic bytes when the Content-Type is generic.
    const res = await fetchFollowing(url, { method: 'GET', headers: { Range: 'bytes=0-1023', Accept: 'application/pdf,*/*' } });
    if (!res.ok && res.status !== 206) {
      void res.body?.cancel().catch(() => {});
      return { status: 'http_error', httpStatus: res.status };
    }
    const type = baseType(res.headers.get('content-type'));
    if (type === 'application/pdf') {
      void res.body?.cancel().catch(() => {});
      return { status: 'ok' };
    }
    if (type && !GENERIC_BINARY.test(type)) {
      void res.body?.cancel().catch(() => {});
      return { status: 'not_pdf', contentType: type };
    }
    const head = Buffer.from(await res.arrayBuffer()).subarray(0, 1024).toString('latin1');
    return head.includes(PDF_MAGIC) ? { status: 'ok' } : { status: 'not_pdf', contentType: type };
  } catch (e) {
    if (e instanceof UrlValidationError) return { status: 'invalid_url', reason: e.message };
    return { status: 'unreachable' };
  }
}
