/**
 * An email failure whose message is safe to show an end user as-is: the provider
 * (Resend) rejected the request with a reason it chose (invalid recipient, rate
 * limit, unverified domain...), or our own config guard fired (no provider key,
 * unverified / paused sending domain).
 * Anything else thrown out of sendEmail (network failure, SDK/runtime exception)
 * is a plain Error and must NOT be echoed to users — it can carry internal
 * detail. Callers that surface errors check `userSafe`.
 */
export class EmailSendError extends Error {
  readonly userSafe = true as const
  constructor(message: string) {
    super(message)
    this.name = 'EmailSendError'
  }
}

/**
 * The workspace's (or sending domain's) send quota for the current window is
 * used up. Not a failure of the email itself: queue workers must defer the job
 * to `retryAt` without spending a retry attempt.
 */
export class EmailRateLimitError extends EmailSendError {
  constructor(message: string, readonly retryAt: Date, readonly scope: string) {
    super(message)
    this.name = 'EmailRateLimitError'
  }
}
