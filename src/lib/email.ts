import { Resend } from 'resend'
import { logger } from '@/shared/logger'

interface SendEmailProps {
 to: string | string[]
 subject: string
 react?: React.ReactElement
 html?: string
 text?: string
 scheduledAt?: string
 attachments?: { filename: string; content: Buffer | Uint8Array | string }[]
 config?: {
  apiKey?: string | null
  fromEmail?: string | null
  fromName?: string | null
  tags?: { name: string; value: string }[]
  headers?: Record<string, string>
 }
}

export async function sendEmail({ to, subject, react, html, text, scheduledAt, attachments, config }: SendEmailProps) {
 const apiKey = config?.apiKey || process.env.RESEND_API_KEY
 const fromAddress = config?.fromEmail || process.env.RESEND_FROM_EMAIL || 'noreply@leadsmind.io'
 const fromName = config?.fromName || 'LeadsMind'
 
 if (!apiKey || apiKey === 're_123' || apiKey.includes('PLACEHOLDER')) {
  logger.info({ to, subject, scheduledAt, tags: config?.tags, attachmentCount: attachments?.length ?? 0 }, 'email.mocked');
  return { id: 'mock_' + Date.now() };
 }

 const resend = new Resend(apiKey)
 try {
  const { data, error } = await resend.emails.send({
   from: `${fromName} <${fromAddress}>`,
   to,
   subject,
   react: react as any,
   html: html || undefined,
   text: text || '',
   tags: config?.tags,
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
   scheduledAt: scheduledAt || undefined,
  } as any)

  if (error) {
   logger.error({ err: error }, 'email.resend_api.failed');
   throw new Error(error.message || 'Failed to send email via Resend');
  }

  return data;
 } catch (error: any) {
  logger.error({ err: error }, 'email.service.exception');
  throw new Error(error.message || 'Email service error');
 }
}
