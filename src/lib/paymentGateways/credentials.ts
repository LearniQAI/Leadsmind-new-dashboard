import { createAdminClient } from '@/lib/supabase/server';
import { encrypt, decrypt, isLegacyCiphertext } from '@/lib/encryption';
import { logger } from '@/shared/logger';

// No per-provider credential-reading helper existed before this (confirmed:
// every existing consumer of workspace_integrations.credentials reads the
// JSONB column raw and casts `as any`). Centralizing read+decrypt here so the
// 3 new gateways' checkout/webhook code never touches raw encrypted fields.

export type GatewayProvider = 'paystack' | 'flutterwave' | 'ozow' | 'paypal' | 'stripe';

export interface PaystackCredentials {
  secretKey: string;
}

export interface FlutterwaveCredentials {
  secretKey: string;
  // Flutterwave's "secret hash" is a separate value the merchant sets in
  // their own dashboard specifically for webhook verif-hash comparison — not
  // derivable from the API secret key, must be collected and stored on its own.
  webhookSecretHash: string;
}

export interface OzowCredentials {
  siteCode: string;
  apiKey: string;
  privateKey: string;
}

// PayPal is structurally different from the 3 BYO-key gateways above: this is
// NOT a secret the workspace supplied — it's the connected seller's PayPal
// merchant id, an identifier returned by PayPal after onboarding under
// LeadsMind's own Partner credentials (PAYPAL_CLIENT_ID/SECRET, env-level,
// never per-workspace). Nothing here is sensitive enough to need encryption
// (see Phase 1 research note in paypalGateway.ts), so it's stored as plain
// fields rather than an `_encrypted` column, mirroring how Stripe Connect
// stores its non-secret `stripe_user_id`/`scope` fields alongside its one
// genuinely secret `access_token_encrypted` field.
export interface PaypalCredentials {
  merchantId: string;
  paymentsReceivable: boolean;
  primaryEmailConfirmed: boolean;
}

// Stripe Connect (per-workspace OAuth, src/app/actions/stripeConnect.ts +
// src/app/api/integrations/stripe/callback/route.ts) — its access_token_encrypted was
// previously read via a direct decrypt() call in getStripeClientForWorkspace
// (src/app/actions/courseCommerce.ts), bypassing this module entirely, which meant a
// legacy-CBC Stripe token would decrypt fine (decrypt() has always accepted both formats)
// but would never opportunistically upgrade to GCM the way the 4 gateways below do.
export interface StripeConnectCredentials {
  accessToken: string;
  stripeUserId: string;
  stripePublishableKey?: string;
}

type CredentialsByProvider = {
  paystack: PaystackCredentials;
  flutterwave: FlutterwaveCredentials;
  ozow: OzowCredentials;
  paypal: PaypalCredentials;
  stripe: StripeConnectCredentials;
};

// Field-name maps between the encrypted-at-rest JSONB shape and the plain
// decrypted shape callers work with — one place to change if a provider's
// stored field names ever need to move. PayPal has no encrypted fields (see
// PaypalCredentials note above) — its raw field names are read directly in
// getGatewayCredentials below instead.
const ENCRYPTED_FIELDS: Record<GatewayProvider, string[]> = {
  paystack: ['secret_key_encrypted'],
  flutterwave: ['secret_key_encrypted', 'webhook_secret_hash_encrypted'],
  ozow: ['site_code_encrypted', 'api_key_encrypted', 'private_key_encrypted'],
  paypal: [],
  stripe: ['access_token_encrypted'],
};

// Decrypts each of `fields` from `raw`, then — if any of them were still on the legacy
// AES-256-CBC format — re-encrypts just those fields (encrypt() always writes the current GCM
// format) and saves the merged credentials blob back to the row. This is lazy/opportunistic
// rotation: a legacy row upgrades to GCM the next time it's legitimately read for real gateway
// use, with no separate bulk migration ever needing to hold plaintext credentials for many rows
// at once. Rotation failure never blocks the caller — the already-decrypted plaintext is still
// returned; the row just stays legacy and gets another chance next read.
async function decryptWithLazyRotation(
  supabase: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  provider: GatewayProvider,
  raw: Record<string, string>,
  fields: string[]
): Promise<Record<string, string>> {
  const plaintext: Record<string, string> = {};
  const rotated: Record<string, string> = {};

  for (const field of fields) {
    plaintext[field] = decrypt(raw[field]);
    if (isLegacyCiphertext(raw[field])) {
      rotated[field] = encrypt(plaintext[field]);
    }
  }

  if (Object.keys(rotated).length > 0) {
    try {
      const { error } = await supabase
        .from('workspace_integrations')
        .update({ credentials: { ...raw, ...rotated }, updated_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId)
        .eq('provider', provider)
        .eq('category', 'payment_gateway');
      if (error) throw error;
      logger.info({ workspaceId, provider, fields: Object.keys(rotated) }, 'payment_gateway.credentials.legacy_encryption_rotated');
    } catch (err) {
      logger.error({ err, workspaceId, provider }, 'payment_gateway.credentials.legacy_encryption_rotation_failed');
    }
  }

  return plaintext;
}

export async function getGatewayCredentials<P extends GatewayProvider>(
  workspaceId: string,
  provider: P
): Promise<CredentialsByProvider[P] | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('workspace_integrations')
    .select('credentials, connected')
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)
    .eq('category', 'payment_gateway')
    .maybeSingle();

  if (error || !data || !data.connected || !data.credentials) return null;

  const c = data.credentials as Record<string, string>;

  try {
    if (provider === 'paystack') {
      if (!c.secret_key_encrypted) return null;
      const p = await decryptWithLazyRotation(supabase, workspaceId, provider, c, ['secret_key_encrypted']);
      return { secretKey: p.secret_key_encrypted } as CredentialsByProvider[P];
    }
    if (provider === 'flutterwave') {
      if (!c.secret_key_encrypted || !c.webhook_secret_hash_encrypted) return null;
      const p = await decryptWithLazyRotation(supabase, workspaceId, provider, c, ['secret_key_encrypted', 'webhook_secret_hash_encrypted']);
      return {
        secretKey: p.secret_key_encrypted,
        webhookSecretHash: p.webhook_secret_hash_encrypted,
      } as CredentialsByProvider[P];
    }
    if (provider === 'ozow') {
      if (!c.site_code_encrypted || !c.api_key_encrypted || !c.private_key_encrypted) return null;
      const p = await decryptWithLazyRotation(supabase, workspaceId, provider, c, ['site_code_encrypted', 'api_key_encrypted', 'private_key_encrypted']);
      return {
        siteCode: p.site_code_encrypted,
        apiKey: p.api_key_encrypted,
        privateKey: p.private_key_encrypted,
      } as CredentialsByProvider[P];
    }
    if (provider === 'paypal') {
      if (!c.merchant_id) return null;
      return {
        merchantId: c.merchant_id,
        paymentsReceivable: !!c.payments_receivable,
        primaryEmailConfirmed: !!c.primary_email_confirmed,
      } as CredentialsByProvider[P];
    }
    if (provider === 'stripe') {
      if (!c.access_token_encrypted || !c.stripe_user_id) return null;
      const p = await decryptWithLazyRotation(supabase, workspaceId, provider, c, ['access_token_encrypted']);
      return {
        accessToken: p.access_token_encrypted,
        stripeUserId: c.stripe_user_id,
        stripePublishableKey: c.stripe_publishable_key,
      } as CredentialsByProvider[P];
    }
  } catch {
    // Corrupt/undecryptable credential blob — treat as not connected rather
    // than throw, same as a missing row.
    return null;
  }

  return null;
}

export function encryptPaystackCredentials(secretKey: string) {
  return { secret_key_encrypted: encrypt(secretKey) };
}

export function encryptFlutterwaveCredentials(secretKey: string, webhookSecretHash: string) {
  return {
    secret_key_encrypted: encrypt(secretKey),
    webhook_secret_hash_encrypted: encrypt(webhookSecretHash),
  };
}

export function encryptOzowCredentials(siteCode: string, apiKey: string, privateKey: string) {
  return {
    site_code_encrypted: encrypt(siteCode),
    api_key_encrypted: encrypt(apiKey),
    private_key_encrypted: encrypt(privateKey),
  };
}

export { ENCRYPTED_FIELDS };
