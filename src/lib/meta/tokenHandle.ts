// Opaque, short-lived handles for Facebook page access tokens in the connect wizard.
//
// The wizard used to receive the plaintext page access token from fetchMetaPages() and post it back on save, so a real
// Meta credential sat in the browser (devtools, extensions, XSS). The browser now receives a handle instead: the token
// sealed with the platform's AES-GCM key (lib/encryption) together with who it was issued to, which page it is for, and an
// expiry. Stateless (nothing is stored); only the server can open it, and only for the same user, workspace and page.
import { encrypt, decrypt } from '@/lib/encryption';

export const PAGE_TOKEN_HANDLE_PREFIX = 'pgh1.';
export const PAGE_TOKEN_HANDLE_TTL_MS = 15 * 60 * 1000;

/** Sent by the WhatsApp wizard path, which has no page token. Not a secret; passes through untouched. */
export const WHATSAPP_PLACEHOLDER_TOKEN = 'whatsapp_placeholder';

export interface PageTokenBinding {
  workspaceId: string;
  userId: string;
  pageId: string;
}

export function isPageTokenHandle(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(PAGE_TOKEN_HANDLE_PREFIX);
}

export function sealPageToken(token: string, binding: PageTokenBinding, now: number = Date.now()): string {
  const payload = JSON.stringify({ t: token, w: binding.workspaceId, u: binding.userId, p: binding.pageId, e: now + PAGE_TOKEN_HANDLE_TTL_MS });
  return PAGE_TOKEN_HANDLE_PREFIX + encrypt(payload);
}

export class PageTokenHandleError extends Error {
  readonly userSafe = true as const;
  constructor(message = 'Your Meta session expired. Please reconnect and try again.') {
    super(message);
    this.name = 'PageTokenHandleError';
  }
}

/** Returns the token, or throws PageTokenHandleError for anything that is not a valid, unexpired handle for exactly this binding. */
export function openPageToken(handle: unknown, binding: PageTokenBinding, now: number = Date.now()): string {
  if (!isPageTokenHandle(handle)) throw new PageTokenHandleError();
  let parsed: any;
  try {
    parsed = JSON.parse(decrypt(handle.slice(PAGE_TOKEN_HANDLE_PREFIX.length)));
  } catch {
    throw new PageTokenHandleError(); // tampered, truncated, or sealed with another key
  }
  if (
    !parsed || typeof parsed.t !== 'string' || !parsed.t ||
    parsed.w !== binding.workspaceId || parsed.u !== binding.userId || parsed.p !== binding.pageId ||
    typeof parsed.e !== 'number' || parsed.e < now
  ) {
    throw new PageTokenHandleError();
  }
  return parsed.t;
}
