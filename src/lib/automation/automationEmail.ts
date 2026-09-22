import { parsePersonalTokens } from '@/lib/builder/emailRenderer';

// Thrown by the send_email action when the recipient may not be emailed
// (unsubscribed / hard-bounced). Not a failure: the executor cancels a
// sequence run, or skips just this step in a generic workflow.
export class EmailSuppressedError extends Error {
  constructor(readonly reason: 'invalid_email' | 'suppressed') {
    super(`Not sent: contact is ${reason === 'suppressed' ? 'unsubscribed' : 'flagged as an invalid email'}`);
    this.name = 'EmailSuppressedError';
  }
}

// Where a step ran: lets send_email tag the message (so bounces/complaints/opens can be
// traced back to this workflow) and derive an idempotency key for the attempt.
export interface StepContext {
  workflowId?: string;
  executionId?: string;
  stepId?: string;
  // Number of earlier logged failures of this step: a genuine retry gets a new key, a
  // crash-redelivery (nothing logged) reuses the old one and is deduplicated by Resend.
  attempt?: number;
}

/**
 * True when retrying the same email can never succeed (bad/missing address, provider or
 * sender misconfiguration). Same substrings the campaign worker treats as a hard failure,
 * plus the automation-specific "no email address" / missing From cases. Everything else
 * (network errors, rate limits, provider 5xx) is transient and worth retrying.
 */
export function isPermanentEmailError(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err ?? '').toLowerCase();
  return (
    msg.includes('no email address') ||
    msg.includes('invalid') ||
    msg.includes('auth') ||
    msg.includes('not configured') ||
    msg.includes('unavailable for this workspace') ||
    msg.includes('set a from email')
  );
}

const UNSUBSCRIBE_TOKEN = /\{\{\s*unsubscribe_link\s*\}\}/i;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface AutomationEmailContact {
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  email?: string | null;
}

// Same tokens the campaign worker resolves (parsePersonalTokens), plus the
// `contact.*` spellings the sequence editor's placeholder advertises.
function tokenVars(contact: AutomationEmailContact, unsubscribeLink: string, escape: (s: string) => string) {
  const first_name = escape(contact.first_name || 'Valued Customer');
  const last_name = escape(contact.last_name || '');
  const company = escape(contact.company || 'your company');
  const email = escape(contact.email || '');
  return {
    first_name, last_name, company, email,
    'contact.first_name': first_name,
    'contact.last_name': last_name,
    'contact.company': company,
    'contact.email': email,
    unsubscribe_link: unsubscribeLink,
  };
}

/**
 * Builds the per-recipient subject/html/text for an automation email.
 * - Resolves merge tokens for this recipient (contact values HTML-escaped in the body).
 * - Guarantees a real, signed unsubscribe link: if the author didn't place
 *   {{unsubscribe_link}} themselves, a footer is appended.
 * - Plain-text bodies are converted to HTML with line breaks preserved.
 */
export function buildAutomationEmail(
  config: { subject?: string; body?: string; isHtml?: boolean },
  contact: AutomationEmailContact,
  unsubscribeLink: string,
): { subject: string; html: string; text: string } {
  const rawBody = config.body || `Hello ${contact.first_name || ''}, this is an automated message.`;
  const isHtml = rawBody.trimStart().startsWith('<') || !!config.isHtml;

  const subject = parsePersonalTokens(config.subject || 'Important Update', undefined, tokenVars(contact, unsubscribeLink, (s) => s));

  let bodyHtml = isHtml
    ? rawBody
    : `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5;">${escapeHtml(rawBody).replace(/\r?\n/g, '<br>')}</div>`;
  if (!UNSUBSCRIBE_TOKEN.test(bodyHtml)) {
    bodyHtml += `<p style="font-family: Arial, sans-serif; font-size: 12px; color: #6b7280; margin-top: 24px;">You are receiving this email because you are in our contact list. <a href="{{unsubscribe_link}}" style="color: #6b7280;">Unsubscribe</a></p>`;
  }
  const html = parsePersonalTokens(bodyHtml, undefined, tokenVars(contact, unsubscribeLink, escapeHtml));

  // Plain-text alternative only for plain-text bodies (HTML bodies keep the
  // campaign behaviour of no text part).
  const text = isHtml
    ? ''
    : `${parsePersonalTokens(rawBody, undefined, tokenVars(contact, unsubscribeLink, (s) => s))}${UNSUBSCRIBE_TOKEN.test(rawBody) ? '' : `\n\nUnsubscribe: ${unsubscribeLink}`}`;

  return { subject, html, text };
}
