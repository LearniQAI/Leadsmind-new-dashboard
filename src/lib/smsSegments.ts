// SMS length, encoding and billing-segment maths (client- and server-safe, no imports).
//
// A text is billed per SEGMENT, not per message:
//   GSM-7 (the basic Latin/GSM alphabet): 160 chars in one segment; once split, 153 per segment
//   Unicode/UCS-2 (any emoji, curly quotes, most non-Latin letters): 70 chars in one segment;
//                 once split, 67 per segment
// A single non-GSM character switches the WHOLE message to UCS-2, so one emoji can more than
// double the cost of a text. A few GSM characters ( ^ { } \ [ ] ~ | € and form feed ) take two
// character slots. UCS-2 length is counted in UTF-16 code units, so an emoji costs 2.

// Longest body a campaign may have. Enforced server-side too (it used to be a silent slice in the UI only).
export const MAX_SMS_BODY_CHARS = 320;

const GSM7_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM7_EXTENDED = '^{}\\[~]|€\f';

const BASIC = new Set(GSM7_BASIC);
const EXTENDED = new Set(GSM7_EXTENDED);

export interface SmsAnalysis {
  encoding: 'GSM-7' | 'Unicode';
  /** Character slots used (GSM extended chars count 2; Unicode counts UTF-16 code units). */
  length: number;
  /** Billing segments per recipient (0 for an empty message). */
  segments: number;
  /** Characters that fit in ONE segment / in each segment once the message is split. */
  singleLimit: number;
  perSegment: number;
  /** Distinct characters that force Unicode (empty when GSM-7). */
  nonGsmChars: string[];
}

export function analyzeSms(text: string): SmsAnalysis {
  const chars = Array.from(text ?? '');
  const nonGsm = [...new Set(chars.filter((c) => !BASIC.has(c) && !EXTENDED.has(c)))];

  if (nonGsm.length === 0) {
    const length = chars.reduce((n, c) => n + (EXTENDED.has(c) ? 2 : 1), 0);
    return {
      encoding: 'GSM-7', length,
      segments: length === 0 ? 0 : length <= 160 ? 1 : Math.ceil(length / 153),
      singleLimit: 160, perSegment: 153, nonGsmChars: [],
    };
  }
  const length = (text ?? '').length; // UTF-16 code units
  return {
    encoding: 'Unicode', length,
    segments: length <= 70 ? 1 : Math.ceil(length / 67),
    singleLimit: 70, perSegment: 67, nonGsmChars: nonGsm,
  };
}

export const STOP_WORDING = 'Reply STOP to opt out.';

/** Whether the message tells the recipient how to opt out (any mention of STOP). */
export function hasOptOutWording(text: string): boolean {
  return /\bSTOP\b/i.test(text ?? '');
}
