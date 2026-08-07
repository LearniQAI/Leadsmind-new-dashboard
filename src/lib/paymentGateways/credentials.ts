import { createAdminClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/encryption';

// No per-provider credential-reading helper existed before this (confirmed:
// every existing consumer of workspace_integrations.credentials reads the
// JSONB column raw and casts `as any`). Centralizing read+decrypt here so the
// 3 new gateways' checkout/webhook code never touches raw encrypted fields.

export type GatewayProvider = 'paystack' | 'flutterwave' | 'ozow';

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

type CredentialsByProvider = {
  paystack: PaystackCredentials;
  flutterwave: FlutterwaveCredentials;
  ozow: OzowCredentials;
};

// Field-name maps between the encrypted-at-rest JSONB shape and the plain
// decrypted shape callers work with — one place to change if a provider's
// stored field names ever need to move.
const ENCRYPTED_FIELDS: Record<GatewayProvider, string[]> = {
  paystack: ['secret_key_encrypted'],
  flutterwave: ['secret_key_encrypted', 'webhook_secret_hash_encrypted'],
  ozow: ['site_code_encrypted', 'api_key_encrypted', 'private_key_encrypted'],
};

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
      return { secretKey: decrypt(c.secret_key_encrypted) } as CredentialsByProvider[P];
    }
    if (provider === 'flutterwave') {
      if (!c.secret_key_encrypted || !c.webhook_secret_hash_encrypted) return null;
      return {
        secretKey: decrypt(c.secret_key_encrypted),
        webhookSecretHash: decrypt(c.webhook_secret_hash_encrypted),
      } as CredentialsByProvider[P];
    }
    if (provider === 'ozow') {
      if (!c.site_code_encrypted || !c.api_key_encrypted || !c.private_key_encrypted) return null;
      return {
        siteCode: decrypt(c.site_code_encrypted),
        apiKey: decrypt(c.api_key_encrypted),
        privateKey: decrypt(c.private_key_encrypted),
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
