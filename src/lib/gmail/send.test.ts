import { describe, it, expect } from 'vitest';
import { buildRawEmail, encodeHeaderWord, replySubject, classifyGmailHttpFailure, toBase64Url, outboundMessageIdFor } from './send';

const headerBlock = (raw: string) => raw.split('\r\n\r\n')[0];
const header = (raw: string, name: string) =>
  headerBlock(raw).split('\r\n').find((l) => l.toLowerCase().startsWith(`${name.toLowerCase()}:`)) ?? null;

describe('buildRawEmail', () => {
  const base = {
    from: { address: 'alice@gmail.com', name: 'Alice Agent' },
    to: { address: 'client@example.com', name: 'Client Co' },
    subject: 'Re: Quote',
    text: 'Hi — here it is.\nThanks',
    messageId: 'lm-1@leadsmind.io',
  };

  it('writes threading headers with angle brackets, References oldest first', () => {
    const raw = buildRawEmail({ ...base, inReplyTo: 'p2@x', references: ['p1@x', 'p2@x'] });
    expect(header(raw, 'Message-ID')).toBe('Message-ID: <lm-1@leadsmind.io>');
    expect(header(raw, 'In-Reply-To')).toBe('In-Reply-To: <p2@x>');
    expect(header(raw, 'References')).toBe('References: <p1@x> <p2@x>');
    expect(header(raw, 'From')).toBe('From: "Alice Agent" <alice@gmail.com>');
    expect(header(raw, 'To')).toBe('To: "Client Co" <client@example.com>');
  });

  it('omits threading headers on a first email', () => {
    const raw = buildRawEmail(base);
    expect(header(raw, 'In-Reply-To')).toBeNull();
    expect(header(raw, 'References')).toBeNull();
  });

  it('body round-trips through base64 (UTF-8 safe)', () => {
    const raw = buildRawEmail(base);
    const body = raw.split('\r\n\r\n')[1].replace(/\r\n/g, '');
    expect(Buffer.from(body, 'base64').toString('utf8')).toBe(base.text);
  });

  it('a CR/LF in the subject or name cannot inject a header', () => {
    const raw = buildRawEmail({ ...base, subject: 'Hi\r\nBcc: victim@x.com', from: { address: 'alice@gmail.com', name: 'A\nBcc: v@x' } });
    expect(headerBlock(raw).split('\r\n').some((l) => l.toLowerCase().startsWith('bcc:'))).toBe(false);
  });

  it('base64url has no +, / or padding', () => {
    expect(toBase64Url(buildRawEmail(base))).not.toMatch(/[+/=]/);
  });
});

describe('header encoding and subjects', () => {
  it('RFC 2047-encodes non-ASCII only', () => {
    expect(encodeHeaderWord('Plain subject')).toBe('Plain subject');
    const enc = encodeHeaderWord('Offre spéciale ✓');
    expect(enc).toMatch(/^=\?UTF-8\?B\?.+\?=$/);
    expect(Buffer.from(enc.slice(10, -2), 'base64').toString('utf8')).toBe('Offre spéciale ✓');
  });

  it('replySubject collapses stacked prefixes', () => {
    expect(replySubject('Re: RE: Fwd: Quote')).toBe('Re: Quote');
    expect(replySubject('Quote')).toBe('Re: Quote');
  });

  it('outbound Message-ID is deterministic per message (retry lookup)', () => {
    expect(outboundMessageIdFor('abc')).toBe(outboundMessageIdFor('abc'));
  });
});

describe('classifyGmailHttpFailure', () => {
  it.each([
    [429, null, 'recoverable'],
    [500, null, 'recoverable'],
    [503, null, 'recoverable'],
    [403, 'userRateLimitExceeded', 'recoverable'],
    [403, 'insufficientPermissions', 'permanent'],
    [403, 'dailyLimitExceeded', 'permanent'],
    [400, 'invalidArgument', 'permanent'],
    [404, null, 'permanent'],
  ])('%i %s -> %s', (status, reason, expected) => {
    expect(classifyGmailHttpFailure(status as number, reason as string | null)).toBe(expected);
  });
});
