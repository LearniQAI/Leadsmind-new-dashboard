import { validateExternalUrl, safeFetch, UrlValidationError, type SafeFetchDeps } from '@/lib/security/validateUrl';
import { extractGoogleDriveFileId } from '@/lib/lms/audio/googleDriveLinkParser';
import { fetchDriveFileMetadata } from '@/lib/lms/drive/driveLinkSource';

// Server-side check that a pasted "Downloadable resource" link is actually reachable, shared by
// every place that field appears (ContentBox/LessonBlockNode's `download` block type, both course
// templates). A Drive link gets the same "Anyone with the link" signal audio/video already check
// (files.get via the API-key-only endpoint: 404 means not shared); anything else gets the same
// ranged-GET reachability check pdfLinkCheck.ts uses, minus the PDF-specific content-type/magic-byte
// assertion, since a Downloadable resource can legitimately be any file type.
export type ResourceLinkCheck =
  | { status: 'ok'; source: 'drive'; name: string | null; mimeType: string | null; size: number | null }
  | { status: 'ok'; source: 'url' }
  | { status: 'invalid_url'; reason: string }
  | { status: 'not_shared' }
  | { status: 'unreachable' }
  | { status: 'http_error'; httpStatus: number };

const TIMEOUT_MS = 10_000;

export async function checkResourceLink(rawUrl: string, deps?: SafeFetchDeps): Promise<ResourceLinkCheck> {
  const trimmed = rawUrl.trim();

  const driveFileId = extractGoogleDriveFileId(trimmed);
  if (driveFileId) {
    const result = await fetchDriveFileMetadata(driveFileId, 'name,mimeType,size');
    if (result.kind === 'not_shared') return { status: 'not_shared' };
    if (result.kind === 'network_error') return { status: 'unreachable' };
    if (result.kind === 'unexpected_status') return { status: 'http_error', httpStatus: result.status };
    return {
      status: 'ok',
      source: 'drive',
      name: result.data.name ?? null,
      mimeType: result.data.mimeType ?? null,
      size: result.data.size ? Number(result.data.size) : null,
    };
  }

  let url: URL;
  try {
    url = validateExternalUrl(trimmed);
  } catch (e) {
    return { status: 'invalid_url', reason: e instanceof UrlValidationError ? e.message : 'Invalid URL format' };
  }

  try {
    // A 1-byte ranged GET, not HEAD: many hosts reject or mis-answer HEAD (same reasoning as
    // pdfLinkCheck.ts). safeFetch resolves + pins the address and re-validates every redirect hop.
    const res = await safeFetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' }, signal: AbortSignal.timeout(TIMEOUT_MS) }, deps);
    void res.body?.cancel().catch(() => {});
    if (!res.ok && res.status !== 206) return { status: 'http_error', httpStatus: res.status };
    return { status: 'ok', source: 'url' };
  } catch (e) {
    if (e instanceof UrlValidationError) return { status: 'invalid_url', reason: e.message };
    return { status: 'unreachable' };
  }
}
