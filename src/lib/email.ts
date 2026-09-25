import { logger } from '@/shared/logger'
import { EmailSendError, EmailRateLimitError } from '@/lib/email/errors'
import { ResendProvider } from '@/lib/email/provider/resend'
import { EmailProviderError } from '@/lib/email/provider/types'
import { isManagedSenderToken } from '@/lib/email/managedSender'

export { EmailSendError, EmailRateLimitError }

interface SendEmailProps {
 to: string | string[]
 subject: string
 react?: React.ReactElement
 html?: string
 text?: string
 scheduledAt?: string
 /**
  * Reply-To address. MUST be passed here (not via `config.headers`) — Resend
  * maps its own `replyTo` field to the RFC `Reply-To:` header, and a
  * `Reply-To` key inside the generic `headers` object is NOT honoured. Setting
  * it via `headers` was the cause of the Communications Hub email-channel
  * bounce (replies went to the `From` no-reply address and bounced).
  */
 replyTo?: string | string[]
 attachments?: { filename: string; content: Buffer | Uint8Array | string }[]
 /**
  * Sent as Resend's Idempotency-Key: a redelivery of the same logical send (e.g. a
  * workflow step re-run after a worker crash) within 24h is deduplicated by Resend
  * instead of emailing the recipient twice.
  */
 idempotencyKey?: string
 config?: {
  apiKey?: string | null
  fromEmail?: string | null
  fromName?: string | null
  tags?: { name: string; value: string }[]
  headers?: Record<string, string>
  /**
   * Opt-in only. Same bug shape as the Twilio global-fallback issue
   * (confirmed live 2026-09-17: an unconfigured workspace's automation/LMS/
   * affiliate emails were silently sent — and billed — through the
   * platform's own RESEND_API_KEY with no visibility that this was
   * happening). Every workspace-scoped caller must pass `config` (even with
   * `apiKey` left undefined) and must NOT set this flag, so an unconfigured
   * workspace throws instead of silently substituting the shared account.
   * The one legitimate exception is a deliberate platform-branded default
   * (e.g. courier/emails.ts's `shipping@leadsmind.io` fallback for
   * non-white-labelled workspaces) — that's a real product feature, not an
   * accidental leak, so it opts in explicitly here.
   */
  allowPlatformFallback?: boolean
 }
}

export async function sendEmail({ to, subject, react, html, text, scheduledAt, replyTo, attachments, idempotencyKey, config }: SendEmailProps): Promise<{ id: string }> {
 const isPlatformLevelSend = config === undefined || config.allowPlatformFallback === true
 const apiKey = isPlatformLevelSend ? (config?.apiKey || process.env.RESEND_API_KEY) : config?.apiKey
 const fromAddress = config?.fromEmail || process.env.RESEND_FROM_EMAIL || 'noreply@leadsmind.io'
 const fromName = config?.fromName || 'LeadsMind'

 // Sending must be fail-closed. Returning a synthetic id here previously made
 // every caller report a successful delivery even though no provider request
 // was made. A provider credential is required for every email environment.
 const normalizedApiKey = apiKey?.trim();
 if (!normalizedApiKey || normalizedApiKey === 're_123' || normalizedApiKey.toUpperCase().includes('PLACEHOLDER')) {
  const error = new EmailSendError(
   isPlatformLevelSend
    ? 'Email delivery is unavailable: a valid Resend API key is not configured.'
    : 'Email delivery is unavailable for this workspace — verify a sending domain in Settings › Domains (or connect your own Resend account) before sending.'
  );
  logger.error({ to, subject, scheduledAt, tags: config?.tags, attachmentCount: attachments?.length ?? 0 }, 'email.resend_config.invalid');
  throw error;
 }

 // LeadsMind-managed sending (see lib/email/managedSender.ts): gate + quota + platform key.
 const managed = isManagedSenderToken(normalizedApiKey)
  ? await import('@/lib/email/managedSending').then((m) => m.prepareManagedSend(normalizedApiKey, fromAddress))
  : null
 const provider = new ResendProvider(managed ? managed.providerApiKey : normalizedApiKey)
 const tags = managed ? [...(config?.tags ?? []), ...managed.tags] : config?.tags

 try {
  const { id } = await provider.send({
   from: `${fromName} <${fromAddress}>`,
   to,
   subject,
   react,
   html,
   text,
   replyTo,
   tags,
   headers: config?.headers,
   // puppeteer-core's page.pdf() returns a Uint8Array, not a real Node
   // Buffer (htmlToPdf.ts casts it with `as Buffer`, but that's a
   // compile-time-only lie) — Buffer.isBuffer() on it returns false, so a
   // strict Buffer check leaves it unconverted and Resend's API rejects the
   // JSON-serialized byte-index object with the same "must be
   // base64-encoded string" error. Route both Buffer and Uint8Array through
   // Buffer.from(...), which accepts either, and only leave real strings
   // (already-base64/text content) untouched.
   attachments: attachments?.map((a) => ({
    filename: a.filename,
    content: typeof a.content === 'string' ? a.content : Buffer.from(a.content).toString('base64'),
   })),
   scheduledAt,
   idempotencyKey,
  })

  if (managed) await managed.recordSent(id, Array.isArray(to) ? to[0] : to, tags)
  return { id };
 } catch (error: any) {
  logger.error({ err: error }, 'email.service.exception');
  // Provider rejections keep a user-safe class; anything else is an
  // internal/transport failure — re-wrap as a plain Error, not user-safe.
  if (error instanceof EmailSendError) throw error;
  if (error instanceof EmailProviderError) throw new EmailSendError(error.message || 'Failed to send email via Resend');
  throw new Error(error.message || 'Email service error');
 }
}
