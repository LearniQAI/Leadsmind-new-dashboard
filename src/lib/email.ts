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
 const fromAddress = config?.fromEmail || process.env.RESEND_FROM_EMAIL || 'noreply@leadsmind.io'
 const fromName = config?.fromName || 'LeadsMind'
 
 if (!apiKey || apiKey === 're_123' || apiKey.includes('PLACEHOLDER')) {
  console.log('\\n================== EMAIL MOCKED ==================');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('==================================================\\n');
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
  })

  if (error) {
   console.error('Resend API Error:', error);
   throw new Error(error.message || 'Failed to send email via Resend');
  }

  return data;
 } catch (error: any) {
  console.error('Email service exception:', error);
  throw new Error(error.message || 'Email service error');
 }
}
