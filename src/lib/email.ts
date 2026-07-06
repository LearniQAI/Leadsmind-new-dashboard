import { Resend } from 'resend'
import { logger } from '@/shared/logger'

interface SendEmailProps {
 to: string | string[]
 subject: string
 react?: React.ReactElement
 html?: string
 text?: string
 scheduledAt?: string
 config?: {
  apiKey?: string | null
  fromEmail?: string | null
  fromName?: string | null
  tags?: { name: string; value: string }[]
  headers?: Record<string, string>
 }
}

export async function sendEmail({ to, subject, react, html, text, scheduledAt, config }: SendEmailProps) {
 const apiKey = config?.apiKey || process.env.RESEND_API_KEY
 const fromAddress = config?.fromEmail || process.env.RESEND_FROM_EMAIL || 'noreply@leadsmind.io'
 const fromName = config?.fromName || 'LeadsMind'
 
 if (!apiKey || apiKey === 're_123' || apiKey.includes('PLACEHOLDER')) {
  logger.info({ to, subject, scheduledAt, tags: config?.tags }, 'email.mocked');
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
