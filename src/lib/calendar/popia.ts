import { createAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';

/**
 * Creates and logs a cryptographically signed POPIA consent audit log on the CRM contact timeline.
 */
export async function logPopiaConsent(
  contactId: string,
  workspaceId: string,
  email: string
): Promise<string> {
  const timestamp = new Date().toISOString();
  
  // Create cryptographic SHA-256 confirmation hash
  const salt = process.env.POPIA_CONSENT_SALT || 'LEADSMIND_POPIA_SECRET_2026';
  const hashInput = `${contactId}:${workspaceId}:${timestamp}:${email}:${salt}`;
  const cryptoHash = crypto.createHash('sha256').update(hashInput).digest('hex');

  const supabase = createAdminClient();

  const description = `POPIA Legal Consent Confirmed and Vaulted. Cryptographic Signature: ${cryptoHash.substring(0, 16)}...`;

  await supabase
    .from('contact_activities')
    .insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      type: 'system',
      description,
      metadata: {
        popia_consent: true,
        popia_timestamp: timestamp,
        popia_signature_hash: cryptoHash,
        consented_email: email,
      },
    });

  return cryptoHash;
}
