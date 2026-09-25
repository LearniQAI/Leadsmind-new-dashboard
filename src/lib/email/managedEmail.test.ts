import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isManagedSenderToken, signManagedSenderToken, verifyManagedSenderToken, domainOfAddress } from './managedSender';
import { normalizeResendEvent, resendBounceType } from './provider/resend';
import { domainStateColumns, isPlatformOwnedDomain, normalizeSendingDomain } from './sendingDomains';
import { buildListUnsubscribeHeaders } from './unsubscribeLink';
import { verifyUnsubscribeToken } from '@/lib/security/unsubscribeToken';

const WS_A = '11111111-1111-4111-8111-111111111111';
const WS_B = '22222222-2222-4222-8222-222222222222';

describe('managed sender token', () => {
  const prev = process.env.ENCRYPTION_KEY;
  beforeEach(() => { process.env.ENCRYPTION_KEY = 'test-signing-key-0123456789abcdef'; });
  afterEach(() => { process.env.ENCRYPTION_KEY = prev; });

  it('round-trips to the workspace it was issued for', () => {
    const t = signManagedSenderToken(WS_A);
    expect(isManagedSenderToken(t)).toBe(true);
    expect(verifyManagedSenderToken(t)).toBe(WS_A);
  });

  it('cannot be re-pointed at another workspace, tampered, or forged', () => {
    const t = signManagedSenderToken(WS_A);
    const mac = t.split('.').pop()!;
    expect(verifyManagedSenderToken(`lm_managed.${WS_B}.${mac}`)).toBeNull();
    expect(verifyManagedSenderToken(t.slice(0, -2) + (t.endsWith('00') ? '11' : '00'))).toBeNull();
    expect(verifyManagedSenderToken(`lm_managed.${WS_A}.deadbeef`)).toBeNull();
    expect(verifyManagedSenderToken(`lm_managed.${WS_A}`)).toBeNull();
    expect(verifyManagedSenderToken('re_live_realkey')).toBeNull();
  });

  it('is invalidated by a different signing key', () => {
    const t = signManagedSenderToken(WS_A);
    process.env.ENCRYPTION_KEY = 'another-key';
    expect(verifyManagedSenderToken(t)).toBeNull();
  });

  it('refuses to mint or verify without a signing key (no guessable default)', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => signManagedSenderToken(WS_A)).toThrow(/signing key/);
  });

  it('extracts the From domain', () => {
    expect(domainOfAddress('Hello@Mail.Acme.com')).toBe('mail.acme.com');
  });
});

describe('normalizeResendEvent', () => {
  const base = { email_id: 'em_1', from: 'A <a@mail.acme.com>', to: ['X@Y.com'], subject: 's', created_at: '2026-09-25T10:00:00Z', message_id: '<m>' };

  it('maps a hard bounce with object tags', () => {
    const e = normalizeResendEvent({ type: 'email.bounced', created_at: 't', data: { ...base, bounce: { type: 'Permanent', subType: 'General', message: '' }, tags: { campaign_id: 'c', workspace_id: WS_A } } }, 'msg_1');
    expect(e).toMatchObject({ type: 'bounce', bounceType: 'hard', messageId: 'em_1', recipient: 'X@Y.com', eventId: 'msg_1', tags: { campaign_id: 'c', workspace_id: WS_A } });
  });

  it('treats Transient / Undetermined as soft', () => {
    expect(resendBounceType({ bounce: { type: 'Transient' } })).toBe('soft');
    expect(resendBounceType({ bounce: { type: 'Undetermined' } })).toBe('soft');
  });

  it('maps complaint, delivered, delayed, click (array tags) and ignores unknown types', () => {
    expect(normalizeResendEvent({ type: 'email.complained', data: base }, null).type).toBe('complaint');
    expect(normalizeResendEvent({ type: 'email.delivered', data: base }, null).type).toBe('delivered');
    expect(normalizeResendEvent({ type: 'email.delivery_delayed', data: base }, null).type).toBe('delivery_delayed');
    const click = normalizeResendEvent({ type: 'email.clicked', data: { ...base, click: { link: 'https://x', ipAddress: '1.2.3.4', userAgent: 'UA' }, tags: [{ name: 'workflow_id', value: 'w' }] } }, null);
    expect(click).toMatchObject({ type: 'click', linkUrl: 'https://x', ipAddress: '1.2.3.4', userAgent: 'UA', tags: { workflow_id: 'w' } });
    expect(normalizeResendEvent({ type: 'contact.created', data: {} }, null).type).toBeNull();
  });

  it('maps email.suppressed with the provider reason', () => {
    const e = normalizeResendEvent({ type: 'email.suppressed', data: { ...base, suppressed: { type: 'OnAccountSuppressionList', message: 'Address is suppressed' } } }, 'msg_s');
    expect(e).toMatchObject({ type: 'suppressed', messageId: 'em_1', recipient: 'X@Y.com', suppression: { type: 'OnAccountSuppressionList', message: 'Address is suppressed' } });
    expect(normalizeResendEvent({ type: 'email.bounced', data: base }, null).suppression).toBeNull();
  });

  it('maps domain.updated to a domain event', () => {
    const e = normalizeResendEvent({ type: 'domain.updated', data: { id: 'dom_1', name: 'acme.com', status: 'verified' } }, null);
    expect(e.domain).toEqual({ id: 'dom_1', status: 'verified' });
    expect(e.messageId).toBeNull();
  });
});

describe('sending domain helpers', () => {
  it('normalizes and validates domains', () => {
    expect(normalizeSendingDomain(' Mail.Acme.COM. ')).toBe('mail.acme.com');
    expect(normalizeSendingDomain('https://acme.co.uk/path')).toBe('acme.co.uk');
    expect(normalizeSendingDomain('localhost')).toBeNull();
    expect(normalizeSendingDomain('10.0.0.1')).toBeNull();
    expect(normalizeSendingDomain('co.uk')).toBeNull();
  });

  it('blocks platform-owned domains and their subdomains', () => {
    expect(isPlatformOwnedDomain('leadsmind.io')).toBe(true);
    expect(isPlatformOwnedDomain('inbox.leadsmind.io')).toBe(true);
    expect(isPlatformOwnedDomain('resend.dev')).toBe(true);
    expect(isPlatformOwnedDomain('notleadsmind.io')).toBe(false);
  });

  it('derives SPF/DKIM flags only from the provider record statuses', () => {
    const cols = domainStateColumns({
      id: 'd', name: 'acme.com', status: 'partially_verified', region: 'us-east-1',
      records: [
        { purpose: 'SPF', type: 'MX', name: 'send', value: 'feedback-smtp.us-east-1.amazonses.com', status: 'verified' },
        { purpose: 'SPF', type: 'TXT', name: 'send', value: 'v=spf1 include:amazonses.com ~all', status: 'pending' },
        { purpose: 'DKIM', type: 'TXT', name: 'resend._domainkey', value: 'p=MIGf', status: 'verified' },
      ],
    });
    expect(cols).toMatchObject({ status: 'partially_verified', spf_status: false, dkim_status: true, verified_at: null });
  });
});

describe('List-Unsubscribe headers', () => {
  it('is RFC 8058 one-click, pointing at the API route with a valid signed token', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.test';
    const h = buildListUnsubscribeHeaders('Ada@X.com', WS_A);
    expect(h['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    const url = new URL(h['List-Unsubscribe'].slice(1, -1));
    expect(url.origin + url.pathname).toBe('https://app.test/api/public/unsubscribe');
    expect(verifyUnsubscribeToken(url.searchParams.get('email')!, url.searchParams.get('workspace_id')!, url.searchParams.get('token')!)).toBe(true);
  });
});
