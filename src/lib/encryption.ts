import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

// Helper to derive a stable 32-byte key from whatever client secrets are present
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || 
                 process.env.GOOGLE_CLIENT_SECRET || 
                 process.env.SUPABASE_SERVICE_ROLE_KEY || 
                 'leadsmind-fallback-hex-secret-key-32b';
  
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a plain text string securely using AES-256-CBC.
 * Returns a colon-separated string: "iv:encryptedHex"
 */
export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a previously encrypted string.
 * Expects a colon-separated string: "iv:encryptedHex"
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encryption payload structure.');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
