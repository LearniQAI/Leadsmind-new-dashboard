import crypto from 'crypto';

// Current scheme: AES-256-GCM (authenticated -- provides both confidentiality
// and tamper detection via the GCM auth tag, unlike the legacy CBC scheme
// below which had neither). Ciphertext format: "gcm1:ivHex:authTagHex:cipherHex".
const ALGORITHM = 'aes-256-gcm';
const GCM_VERSION_TAG = 'gcm1';
const GCM_IV_BYTES = 12; // NIST-recommended IV length for GCM

// Legacy scheme (pre-2026-08-30): AES-256-CBC, no auth tag, format "ivHex:cipherHex".
// decrypt() still accepts this format so previously-encrypted values (Facebook/
// LinkedIn/TikTok/YouTube tokens, Twilio/Investec/Stripe/payment-gateway
// credentials, webhook secrets, etc. -- ~24 files reuse this module) keep
// working without a forced mass re-encryption pass. encrypt() only ever
// writes the new GCM format going forward; any value that gets re-saved
// through a normal update flow is upgraded to GCM automatically.
const LEGACY_ALGORITHM = 'aes-256-cbc';

function getEncryptionKey(): Buffer {
  const encryptionKeyEnv = process.env.ENCRYPTION_KEY;
  if (!encryptionKeyEnv) {
    throw new Error('[FATAL] ENCRYPTION_KEY env var is not configured');
  }
  return crypto.createHash('sha256').update(encryptionKeyEnv).digest();
}

/**
 * Encrypts a plain text string using AES-256-GCM.
 * Returns "gcm1:ivHex:authTagHex:cipherHex".
 */
export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(GCM_IV_BYTES);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${GCM_VERSION_TAG}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a value produced by encrypt() (current AES-256-GCM format) or by
 * the pre-2026-08-30 AES-256-CBC format, distinguished by the "gcm1:" prefix.
 * Throws if the ciphertext or auth tag has been tampered with (GCM) or if
 * the payload doesn't match either known format.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  const parts = encryptedText.split(':');
  const key = getEncryptionKey();

  if (parts.length === 4 && parts[0] === GCM_VERSION_TAG) {
    const [, ivHex, authTagHex, cipherHex] = parts;
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  if (parts.length === 2) {
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(LEGACY_ALGORITHM, key, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  throw new Error('Invalid encryption payload structure.');
}
