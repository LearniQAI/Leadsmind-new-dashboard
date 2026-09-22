// Extracts a Google Drive file id from the common share-link shapes an admin might paste.
// Drive file ids are alphanumeric plus '-' and '_', so anything else is rejected outright — this
// id gets interpolated into our own server-side fetch URL to the fixed googleapis.com host later,
// so validating the charset here is what keeps that safe (there is no other user-controlled part
// of that request).
const DRIVE_ID_RE = /^[a-zA-Z0-9_-]{10,}$/;

export function extractGoogleDriveFileId(rawUrl: string): string | null {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return null;

  // A bare id, no URL at all.
  if (DRIVE_ID_RE.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (!/(^|\.)drive\.google\.com$/.test(url.hostname) && !/(^|\.)docs\.google\.com$/.test(url.hostname)) {
    return null;
  }

  // /file/d/{id}/view, /file/d/{id}/edit, /file/d/{id}
  const pathMatch = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (pathMatch) return pathMatch[1];

  // /open?id={id}, /uc?id={id}&export=download, /uc?export=download&id={id}
  const idParam = url.searchParams.get('id');
  if (idParam && DRIVE_ID_RE.test(idParam)) return idParam;

  return null;
}
