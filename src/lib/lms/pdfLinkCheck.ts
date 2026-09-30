import { validateExternalUrl, safeFetch, UrlValidationError, type SafeFetchDeps } from '@/lib/security/validateUrl';

// Server-side check that a pasted link really serves a PDF. Each outcome is distinct so the editor
// can say exactly what is wrong instead of a generic "invalid link".
export type PdfCheck =
  | { status: 'ok' }
  | { status: 'invalid_url'; reason: string }
  | { status: 'unreachable' }
  | { status: 'http_error'; httpStatus: number }
  | { status: 'not_pdf'; contentType: string | null };

const TIMEOUT_MS = 10_000;
const PDF_MAGIC = '%PDF-';
// Hosts often serve PDFs as a generic binary type; those are only accepted when the bytes prove it.
const GENERIC_BINARY = /^(application\/(octet-stream|binary|download|x-download)|binary\/octet-stream)$/i;

const baseType = (h: string | null) => (h ? h.split(';')[0].trim().toLowerCase() : null);

/** `deps` exists so tests can stand in for DNS and the network; production passes nothing. */
export async function checkPdfLink(rawUrl: string, deps?: SafeFetchDeps): Promise<PdfCheck> {
  let url: URL;
  try {
    url = validateExternalUrl(rawUrl.trim());
  } catch (e) {
    return { status: 'invalid_url', reason: e instanceof UrlValidationError ? e.message : 'Invalid URL format' };
  }

  try {
    // A 1 KB ranged GET (not HEAD): many PDF hosts reject or mis-answer HEAD, and it lets us read
    // the magic bytes when the Content-Type is generic.
    // safeFetch resolves + pins the address and re-validates every redirect hop (DNS-rebinding safe).
    const res = await safeFetch(url, { method: 'GET', headers: { Range: 'bytes=0-1023', Accept: 'application/pdf,*/*' }, signal: AbortSignal.timeout(TIMEOUT_MS) }, deps);
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
