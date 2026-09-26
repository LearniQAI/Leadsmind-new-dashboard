import { describe, it, expect } from 'vitest';
import { parseGmailMessage, parseAddressList, stripQuotedReply, decodeEncodedWords, htmlToText } from './parse';

const b64u = (s: string) => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('parseAddressList', () => {
  it('handles quoted names with commas, bare addresses, and case', () => {
    expect(parseAddressList('"Last, First" <First@X.com>, b@y.com, Carol <c@z.io>')).toEqual([
      { address: 'first@x.com', name: 'Last, First' },
      { address: 'b@y.com', name: null },
      { address: 'c@z.io', name: 'Carol' },
    ]);
  });
  it('decodes RFC 2047 names and drops junk', () => {
    expect(parseAddressList('=?UTF-8?B?w4lsaXNl?= <e@x.com>, undisclosed-recipients:;')).toEqual([{ address: 'e@x.com', name: 'Élise' }]);
  });
});

describe('decodeEncodedWords', () => {
  it('B and Q encodings', () => {
    expect(decodeEncodedWords('=?UTF-8?Q?Caf=C3=A9_menu?=')).toBe('Café menu');
    expect(decodeEncodedWords('Re: =?utf-8?B?T2ZmcmUg4pyT?=')).toBe('Re: Offre ✓');
  });
});

describe('stripQuotedReply', () => {
  it('cuts Gmail quote headers, including when wrapped onto two lines', () => {
    expect(stripQuotedReply('Sounds good.\n\nOn Fri, 26 Sep 2026 at 10:00, Alice <a@x.com> wrote:\n> old')).toBe('Sounds good.');
    expect(stripQuotedReply('Yes!\r\n\r\nOn Fri, 26 Sep 2026 at 10:00, Alice Agent <\r\nalice@x.com> wrote:\r\n> old')).toBe('Yes!');
  });
  it('cuts Outlook separators', () => {
    expect(stripQuotedReply('Done\n\n-----Original Message-----\nFrom: x')).toBe('Done');
  });
  it('keeps text that is entirely quoted rather than returning nothing', () => {
    expect(stripQuotedReply('> only quote')).toBe('> only quote');
  });
});

describe('htmlToText', () => {
  it('drops tags/styles and keeps line breaks', () => {
    expect(htmlToText('<style>p{}</style><p>Hi&nbsp;there</p><p>Line&amp;2<br>3</p>')).toBe('Hi there\nLine&2\n3');
  });
});

describe('parseGmailMessage', () => {
  const resource = {
    id: '18f00', threadId: '18eff', labelIds: ['INBOX', 'CATEGORY_PERSONAL'], internalDate: '1790380800000', snippet: 'snip',
    payload: {
      mimeType: 'multipart/mixed',
      headers: [
        { name: 'From', value: 'Client Person <Client@Example.com>' },
        { name: 'To', value: 'me@gmail.com' },
        { name: 'Cc', value: 'boss@example.com' },
        { name: 'Subject', value: 'Re: Quote' },
        { name: 'Message-ID', value: '<CAB1@mail.gmail.com>' },
        { name: 'In-Reply-To', value: '<lm-1@leadsmind.io>' },
        { name: 'References', value: '<root@x> <lm-1@leadsmind.io>' },
      ],
      parts: [
        {
          mimeType: 'multipart/alternative',
          parts: [
            { mimeType: 'text/plain', headers: [{ name: 'Content-Type', value: 'text/plain; charset="UTF-8"' }], body: { data: b64u('Thanks — got it.\n\nOn Fri, x wrote:\n> q') } },
            { mimeType: 'text/html', body: { data: b64u('<p>Thanks — got it.</p>') } },
          ],
        },
        { mimeType: 'application/pdf', filename: 'quote.pdf', headers: [{ name: 'Content-Disposition', value: 'attachment; filename="quote.pdf"' }], body: { attachmentId: 'ANGj1', size: 2048 } },
        { mimeType: 'image/png', filename: 'logo.png', headers: [{ name: 'Content-ID', value: '<logo1>' }], body: { attachmentId: 'ANGj2', size: 99 } },
      ],
    },
  };

  it('extracts identity, threading, bodies and attachments', () => {
    const m = parseGmailMessage(resource);
    expect(m).toMatchObject({
      id: '18f00', threadId: '18eff', date: new Date(1790380800000).toISOString(),
      from: { address: 'client@example.com', name: 'Client Person' },
      to: [{ address: 'me@gmail.com', name: null }], cc: [{ address: 'boss@example.com', name: null }],
      subject: 'Re: Quote', messageId: 'CAB1@mail.gmail.com', inReplyTo: 'lm-1@leadsmind.io',
      references: ['root@x', 'lm-1@leadsmind.io'], html: '<p>Thanks — got it.</p>',
    });
    expect(m.text).toContain('Thanks — got it.');
    expect(m.attachments).toEqual([
      { filename: 'quote.pdf', contentType: 'application/pdf', sizeBytes: 2048, attachmentId: 'ANGj1', contentId: null, isInline: false },
      { filename: 'logo.png', contentType: 'image/png', sizeBytes: 99, attachmentId: 'ANGj2', contentId: 'logo1', isInline: true },
    ]);
  });

  it('html-only mail gets a text body from the html', () => {
    const m = parseGmailMessage({ id: '1', payload: { mimeType: 'text/html', headers: [{ name: 'From', value: 'a@b.com' }], body: { data: b64u('<p>Hello <b>you</b></p>') } } });
    expect(m.text).toBe('Hello you');
  });
});
