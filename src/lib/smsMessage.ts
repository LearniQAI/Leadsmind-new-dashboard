import { parsePersonalTokens } from '@/lib/builder/emailRenderer';

// Per-recipient merge tags for SMS/WhatsApp bodies, using the SAME resolver the email paths use
// (parsePersonalTokens): {{first_name}} {{last_name}} {{company}} {{email}}, plus the
// {{contact.first_name}} spelling. A message is plain text, so values are inserted as-is (no HTML
// escaping). An unknown tag resolves to '' rather than being sent to a customer as literal braces,
// and a contact with no first name gets the same fallback the email renderer uses.
export interface SmsMessageContact {
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  email?: string | null;
}

export function renderSmsBody(template: string, contact: SmsMessageContact): string {
  const first_name = contact.first_name || 'Valued Customer';
  const last_name = contact.last_name || '';
  const company = contact.company || 'your company';
  const email = contact.email || '';
  return parsePersonalTokens(template ?? '', undefined, {
    first_name, last_name, company, email,
    'contact.first_name': first_name,
    'contact.last_name': last_name,
    'contact.company': company,
    'contact.email': email,
  });
}

export function hasMergeTags(template: string): boolean {
  return /\{\{\s*[a-zA-Z0-9_.-]+\s*\}\}/.test(template ?? '');
}
