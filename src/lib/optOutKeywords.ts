// Inbound opt-out / opt-in keywords. Exact match only, after trim + case-folding + dropping trailing
// punctuation/whitespace, so "Stop." and " stop " count but "please stop messaging me" does not (a free
// sentence must never silently unsubscribe someone, nor be silently ignored as a keyword).
// The STOP set is the one the Twilio inbound webhook uses, plus REMOVE for WhatsApp.
export const WHATSAPP_STOP_KEYWORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'REMOVE'];
export const WHATSAPP_START_KEYWORDS = ['START', 'UNSTOP'];

export function normalizeKeyword(text: string | null | undefined): string {
  return String(text ?? '').trim().replace(/[.!\s]+$/, '').toUpperCase();
}

export function classifyWhatsAppKeyword(text: string | null | undefined): 'stop' | 'start' | null {
  const k = normalizeKeyword(text);
  if (WHATSAPP_STOP_KEYWORDS.includes(k)) return 'stop';
  if (WHATSAPP_START_KEYWORDS.includes(k)) return 'start';
  return null;
}
