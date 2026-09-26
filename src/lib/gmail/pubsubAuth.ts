// Authenticates Gmail push notifications delivered by a Google Cloud Pub/Sub PUSH subscription with
// OIDC auth: the request carries a Google-signed JWT. Checked:
//   - signature: Google's public keys (injectable for tests)
//   - iss:       accounts.google.com
//   - aud:       GMAIL_PUBSUB_AUDIENCE (default: the push endpoint's public URL)
//   - email:     GMAIL_PUBSUB_SERVICE_ACCOUNT (the service account the subscription pushes as), verified
// Fails closed when GMAIL_PUBSUB_SERVICE_ACCOUNT isn't configured.

import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { logger } from '@/shared/logger';

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export function pushAudience(requestUrl: string): string {
  return process.env.GMAIL_PUBSUB_AUDIENCE
    || `${process.env.NEXT_PUBLIC_APP_URL || new URL(requestUrl).origin}/api/webhooks/gmail/push`;
}

export async function verifyPubSubToken(
  authorization: string | null,
  requestUrl: string,
  keys: JWTVerifyGetKey = GOOGLE_JWKS,
): Promise<boolean> {
  const serviceAccount = process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    logger.error({}, 'gmail.push.not_configured');
    return false;
  }
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: pushAudience(requestUrl),
    });
    return payload.email === serviceAccount && payload.email_verified === true;
  } catch (err) {
    logger.warn({ err }, 'gmail.push.token_invalid');
    return false;
  }
}
