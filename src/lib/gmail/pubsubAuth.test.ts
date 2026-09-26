import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from 'jose';
import { verifyPubSubToken } from './pubsubAuth';

const SA = 'gmail-push@leadsmind-prod.iam.gserviceaccount.com';
const URL_ = 'https://www.leadsmind.io/api/webhooks/gmail/push';
let keys: ReturnType<typeof createLocalJWKSet>;
let priv: any;
let otherPriv: any;

const token = async (claims: Record<string, any>, key = priv, exp = '5m') =>
  new SignJWT({ email: SA, email_verified: true, ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(claims.iss ?? 'https://accounts.google.com')
    .setAudience(claims.aud ?? URL_)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(key);

beforeAll(async () => {
  const a = await generateKeyPair('RS256');
  const b = await generateKeyPair('RS256');
  priv = a.privateKey;
  otherPriv = b.privateKey;
  keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(a.publicKey)), kid: 'k1', alg: 'RS256' }] });
  process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT = SA;
  delete process.env.GMAIL_PUBSUB_AUDIENCE;
  process.env.NEXT_PUBLIC_APP_URL = 'https://www.leadsmind.io';
});
afterEach(() => { process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT = SA; });

describe('verifyPubSubToken', () => {
  it('accepts a Google-signed token for our endpoint from the configured service account', async () => {
    expect(await verifyPubSubToken(`Bearer ${await token({})}`, URL_, keys)).toBe(true);
  });

  it.each([
    ['wrong audience', { aud: 'https://evil.example/hook' }],
    ['wrong issuer', { iss: 'https://evil.example' }],
    ['other service account', { email: 'someone@else.iam.gserviceaccount.com' }],
    ['unverified email', { email_verified: false }],
  ])('rejects %s', async (_label, claims) => {
    expect(await verifyPubSubToken(`Bearer ${await token(claims)}`, URL_, keys)).toBe(false);
  });

  it('rejects a token signed by another key, an expired token, and no token', async () => {
    expect(await verifyPubSubToken(`Bearer ${await token({}, otherPriv)}`, URL_, keys)).toBe(false);
    expect(await verifyPubSubToken(`Bearer ${await token({}, priv, '-1m')}`, URL_, keys)).toBe(false);
    expect(await verifyPubSubToken(null, URL_, keys)).toBe(false);
  });

  it('fails closed when the service account is not configured', async () => {
    delete process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT;
    expect(await verifyPubSubToken(`Bearer ${await token({})}`, URL_, keys)).toBe(false);
  });
});
