import { Resend } from 'resend'

interface SendEmailProps {
  to: string | string[]
  subject: string
  react?: React.ReactElement
  html?: string
  text?: string
  config?: {
    apiKey?: string | null
    fromEmail?: string | null
    fromName?: string | null
  }
}

export async function sendEmail({ to, subject, react, html, text, config }: SendEmailProps) {
  const apiKey = config?.apiKey || process.env.RESEND_API_KEY
  const fromAddress = config?.fromEmail || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const fromName = config?.fromName || 'LeadsMind'
  
  if (!apiKey || apiKey === 're_123' || apiKey.includes('PLACEHOLDER')) {
    throw new Error('Email service is not configured. Please add your RESEND_API_KEY to settings.');
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
    })

    if (error) {
      console.error('Resend error:', error)
      throw new Error('Failed to send email')
    }

    return data
  } catch (error) {
    console.error('Email service error:', error)
    throw error
  }
}
