import { AppError } from './AppError';

/**
 * Whether an error's message is safe to show an end user as-is.
 *
 * Safe (deliberately authored for users / chosen by an upstream provider):
 *  - EmailSendError (`userSafe = true`): the email provider rejected the request
 *    with its own reason, or our own "connect a Resend account" config guard.
 *  - AppError: the codebase's existing client-safe error family (the same one
 *    toClientError() already exposes).
 *
 * Everything else — DB/driver errors, network failures, PDF/Chromium failures,
 * arbitrary runtime exceptions — can carry internal detail (hosts, paths, SQL,
 * credentials in connection strings) and must be logged server-side and replaced
 * by a generic message. A PDF-generation failure has no "the provider rejected
 * your input" safe case, so it is never safe.
 */
export function isUserSafeError(e: unknown): e is Error {
  return (e as any)?.userSafe === true || e instanceof AppError;
}

/** The error's own message if it is safe to show, otherwise `generic`. */
export function userSafeMessage(e: unknown, generic: string): string {
  return isUserSafeError(e) && e.message ? e.message : generic;
}
