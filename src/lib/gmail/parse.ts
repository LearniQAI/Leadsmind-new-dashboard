// Pure parsing of Gmail API `users.messages.get?format=full` resources (no I/O) — unit-tested.

import { normalizeMessageId, parseMessageIdList, type EmailAddress } from '@/lib/email/emailMessageStore';

export interface ParsedAttachment {
  filename: string;
  contentType: string | null;
  sizeBytes: number | null;
  attachmentId: string;
  contentId: string | null;
  isInline: boolean;
}

export interface ParsedGmailMessage {
  id: string;
  threadId: string | null;
  labelIds: string[];
  /** ISO timestamp from Gmail's internalDate (when Gmail received / sent it). */
  date: string;
  from: EmailAddress | null;
  to: EmailAddress[];
  cc: EmailAddress[];
  subject: string | null;
  messageId: string | null;
  inReplyTo: string | null;
  references: string[];
  text: string;
  html: string | null;
  attachments: ParsedAttachment[];
}

export function decodeBase64Url(data: string, charset?: string | null): string {
  const buf = Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const cs = (charset || 'utf-8').toLowerCase();
  try {
    return new TextDecoder(cs === 'us-ascii' ? 'utf-8' : cs).decode(buf);
  } catch {
    return buf.toString('utf8');
  }
}

function header(headers: any[] | undefined, name: string): string | null {
  const want = name.toLowerCase();
  const h = (headers || []).find((x: any) => String(x?.name).toLowerCase() === want);
  return h?.value != null ? String(h.value) : null;
}

function charsetOf(part: any): string | null {
  const ct = header(part?.headers, 'Content-Type') || '';
  const m = ct.match(/charset="?([^";\s]+)"?/i);
  return m ? m[1] : null;
}

/** RFC 2047 encoded-words in display names ("=?UTF-8?B?...?="). */
export function decodeEncodedWords(value: string): string {
  return value.replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_m, charset, enc, text) => {
    try {
      const bytes = enc.toUpperCase() === 'B'
        ? Buffer.from(text, 'base64')
        : Buffer.from(text.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_x: string, hex: string) => String.fromCharCode(parseInt(hex, 16))), 'latin1');
      return new TextDecoder(String(charset).toLowerCase()).decode(bytes);
    } catch {
      return text;
    }
  });
}

/**
 * "A B" <a@x>, b@y, "Last, First" <c@z>  ->  addresses (lowercased) with names. Commas inside quotes
 * or angle brackets don't split.
 */
export function parseAddressList(value: string | null | undefined): EmailAddress[] {
  if (!value) return [];
  const parts: string[] = [];
  let cur = '';
  let inQuote = false;
  let inAngle = false;
  for (const ch of value) {
    if (ch === '"' && !inAngle) inQuote = !inQuote;
    else if (ch === '<' && !inQuote) inAngle = true;
    else if (ch === '>' && !inQuote) inAngle = false;
    if (ch === ',' && !inQuote && !inAngle) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);

  const out: EmailAddress[] = [];
  for (const raw of parts) {
    const p = raw.trim();
    if (!p) continue;
    const angle = p.match(/^(.*)<([^<>]+)>\s*$/);
    const address = (angle ? angle[2] : p).trim().replace(/^mailto:/i, '').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+$/.test(address)) continue;
    const name = angle ? decodeEncodedWords(angle[1].trim().replace(/^"|"$/g, '').replace(/\\"/g, '"')).trim() : '';
    out.push({ address, name: name || null });
  }
  return out;
}

/**
 * Drops the quoted history under a reply so the Conversations bubble shows what was actually
 * written (the full original stays in html_body). Returns the input when stripping would leave
 * nothing.
 */
export function stripQuotedReply(text: string): string {
  const markers = [
    /\r?\n[^\n]*On [^\n]{0,200}(\r?\n[^\n]{0,200})?wrote:\s*\r?\n/i, // Gmail / Apple (may wrap)
    /\r?\n-{2,}\s*Original Message\s*-{2,}/i, // Outlook plain
    /\r?\n_{10,}\s*\r?\nFrom: /i, // Outlook web
    /\r?\n-{2,}\s*Forwarded message\s*-{2,}/i,
  ];
  let cut = text.length;
  for (const re of markers) {
    const m = re.exec(text);
    if (m && m.index < cut) cut = m.index;
  }
  const stripped = text.slice(0, cut).replace(/(\r?\n>.*)+\s*$/g, '').trim();
  return stripped || text.trim();
}

export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

export function parseGmailMessage(resource: any): ParsedGmailMessage {
  const payload = resource?.payload || {};
  const headers = payload.headers || [];
  let text: string | null = null;
  let html: string | null = null;
  const attachments: ParsedAttachment[] = [];

  const walk = (part: any) => {
    if (!part) return;
    const mime = String(part.mimeType || '').toLowerCase();
    const filename = part.filename || '';
    const disposition = (header(part.headers, 'Content-Disposition') || '').toLowerCase();
    const contentId = normalizeMessageId(header(part.headers, 'Content-ID'));

    if (part.body?.attachmentId && (filename || contentId)) {
      attachments.push({
        filename: filename || `${contentId || 'attachment'}`,
        contentType: part.mimeType || null,
        sizeBytes: typeof part.body.size === 'number' ? part.body.size : null,
        attachmentId: part.body.attachmentId,
        contentId,
        isInline: disposition.startsWith('inline') || (!!contentId && !disposition.startsWith('attachment')),
      });
    } else if (!filename && part.body?.data && mime === 'text/plain' && text === null) {
      text = decodeBase64Url(part.body.data, charsetOf(part));
    } else if (!filename && part.body?.data && mime === 'text/html' && html === null) {
      html = decodeBase64Url(part.body.data, charsetOf(part));
    }
    for (const child of part.parts || []) walk(child);
  };
  walk(payload);

  const fromList = parseAddressList(header(headers, 'From'));
  const plain = text !== null ? (text as string) : html !== null ? htmlToText(html as string) : String(resource?.snippet || '');
  const internal = Number(resource?.internalDate);

  return {
    id: String(resource?.id),
    threadId: resource?.threadId ? String(resource.threadId) : null,
    labelIds: Array.isArray(resource?.labelIds) ? resource.labelIds : [],
    date: new Date(Number.isFinite(internal) && internal > 0 ? internal : Date.now()).toISOString(),
    from: fromList[0] || null,
    to: parseAddressList(header(headers, 'To')),
    cc: parseAddressList(header(headers, 'Cc')),
    subject: header(headers, 'Subject') ? decodeEncodedWords(header(headers, 'Subject') as string).trim() : null,
    messageId: normalizeMessageId(header(headers, 'Message-ID') || header(headers, 'Message-Id')),
    inReplyTo: normalizeMessageId(header(headers, 'In-Reply-To')),
    references: parseMessageIdList(header(headers, 'References')),
    text: plain,
    html,
    attachments,
  };
}
