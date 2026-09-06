import { Webhook } from 'svix';

export type SvixHeaderBag = Record<'svix-id' | 'svix-timestamp' | 'svix-signature', string>;

/**
 * Verify a Resend (svix-signed) webhook request and return its parsed JSON body.
 *
 * Why this exists — the second production 500 on /api/webhooks/resend/inbound
 * (detail: "Cannot read properties of undefined (reading 'type')", code: null,
 * i.e. a plain TypeError before any DB call):
 *
 *   svix was bumped ^1.94.0 -> ^2.2.0 in commit 742b29cb (a mass dependency
 *   update). That is a BREAKING change to `Webhook.verify()`:
 *     - svix 1.x  -> verify() returned the parsed JSON payload.
 *     - svix 2.x  -> the `Webhook` compat wrapper calls the core verifier with
 *                    `{ jsonParse: false }`, so verify() now returns `undefined`
 *                    on success (it still THROWS `WebhookVerificationError` on a
 *                    bad/missing signature).
 *
 *   Both `const event = wh.verify(...)` call sites (this route and
 *   /api/webhooks/email/deliverability) silently started getting `undefined`,
 *   then threw on the next `event.type` / `body.type` access — caught as a
 *   generic 500. The whole endpoint has been dead since that bump.
 *
 * This helper restores the 1.x contract: verify the signature (still throws on
 * failure — the security-critical behaviour is unchanged), THEN JSON.parse the
 * raw body ourselves. An empty authenticated body returns `{}` rather than
 * throwing (matches svix's own empty-payload handling).
 */
export function verifyResendWebhookEvent(rawBody: string, headers: SvixHeaderBag, secret: string): any {
  // Throws WebhookVerificationError on an invalid or missing signature.
  new Webhook(secret).verify(rawBody, headers);

  const trimmed = (rawBody ?? '').trim();
  if (!trimmed) return {};
  return JSON.parse(trimmed);
}
