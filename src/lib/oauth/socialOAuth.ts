import { NextResponse } from 'next/server';

// Every external call in a social-connect callback goes through providerFetch: Node's fetch has
// no default timeout (undici waits ~300s for headers), so one stalled provider call used to hold
// the whole callback — and the user's browser — for minutes.
export const PROVIDER_TIMEOUT_MS = 10_000;

// Fixed vocabulary — the ONLY values that ever reach a redirect URL. Raw error messages are never
// put in a URL (they can carry hosts, ids or provider internals); the UI maps these to copy.
export type OAuthFailureCode =
  | 'access_denied'
  | 'timeout'
  | 'provider_error'
  | 'invalid_state'
  | 'no_page'
  | 'save_failed'
  | 'webhook_failed'
  | 'no_channel'
  | 'missing_parameters';

export class OAuthFlowError extends Error {
  userSafe = true;
  constructor(public code: OAuthFailureCode, message?: string) {
    super(message ?? code);
    this.name = 'OAuthFlowError';
  }
}

export async function providerFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = PROVIDER_TIMEOUT_MS
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err: any) {
    // Deliberately drops the original error: undici network errors can echo the request URL,
    // which for Graph API calls contains an access_token query parameter.
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new OAuthFlowError('timeout', 'Provider did not respond in time');
    }
    throw new OAuthFlowError('provider_error', 'Provider request failed');
  }
}

// Parse a provider JSON body without letting a non-JSON/HTML error page become a generic crash.
export async function readJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    throw new OAuthFlowError('provider_error', 'Provider returned an unreadable response');
  }
}

export function failureCodeOf(err: unknown): OAuthFailureCode {
  if (err instanceof OAuthFlowError) return err.code;
  if ((err as any)?.name === 'ForbiddenError') return 'invalid_state';
  return 'provider_error';
}

// Log-safe description of a failure: error name + our own code, never message text or the
// error object itself (provider/DB errors can embed tokens, codes or URLs).
export function safeErrorInfo(err: unknown): { name: string; code: OAuthFailureCode } {
  return { name: (err as any)?.name ?? 'Error', code: failureCodeOf(err) };
}

export function socialConnectionsRedirect(
  platform: string,
  result: { success: true; warning?: 'discovery_failed' } | { error: OAuthFailureCode },
  path = '/social/connections'
) {
  const params = new URLSearchParams({ platform });
  if ('success' in result) {
    params.set('success', '1');
    if (result.warning) params.set('warning', result.warning);
  } else {
    params.set('error', result.error);
  }
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}${path}?${params.toString()}`);
}
