import crypto from 'crypto'

// Shared AES-256-GCM encrypt/decrypt + key-derivation for at-rest document encryption.
// Factored out of src/app/api/kyc/documents/{upload,download}/route.ts, which each defined
// an identical getKycEncryptionKey() — this pass adds a second encrypted-document store
// (employee documents, Task 46) and duplicating that crypto code a third/fourth time was
// the wrong move per this project's reuse-over-parallel-systems principle. Both the KYC
// routes and the new employee-document routes now call this shared module.

/** Hashes a raw env-var secret down to exactly 32 bytes (256 bits) for AES-256. */
export function deriveEncryptionKey(rawKey: string): Buffer {
  return crypto.createHash('sha256').update(rawKey).digest()
}

// Fail-closed by design, same as the original KYC helper: a hardcoded fallback key here
// would mean anyone who reads this source (or any repo fork/clone) could decrypt every
// document for any deployment that forgot to set the env var.
function requireRawKey(envVarName: string): string {
  const value = process.env[envVarName]
  if (!value) {
    throw new Error(`[FATAL] ${envVarName} env var is not configured`)
  }
  return value
}

/**
 * Reads and derives the encryption key from the given env var, hashing it to 32 bytes.
 * Employee documents deliberately reuse KYC_ENCRYPTION_KEY (already provisioned and
 * proven working in every environment) rather than requiring a brand-new secret be
 * configured before this feature works at all — see Task 46 build report for the
 * reasoning. Pass a different envVarName to use a separate key for a different store.
 */
export function getDocumentEncryptionKey(envVarName: string = 'KYC_ENCRYPTION_KEY'): Buffer {
  return deriveEncryptionKey(requireRawKey(envVarName))
}

export interface EncryptedPayload {
  encryptedBuffer: Buffer
  iv: Buffer
  authTag: Buffer
}

/** Encrypts a buffer with AES-256-GCM using a fresh random 12-byte IV (GCM standard). */
export function encryptBuffer(plainBuffer: Buffer, key: Buffer): EncryptedPayload {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encryptedBuffer = Buffer.concat([cipher.update(plainBuffer), cipher.final()])
  const authTag = cipher.getAuthTag()
  return { encryptedBuffer, iv, authTag }
}

/**
 * Decrypts an AES-256-GCM payload. Throws (via decipher.final()) if the auth tag doesn't
 * match — authenticated encryption detects tampering/corruption that plain CBC could not.
 */
export function decryptBuffer(encryptedBuffer: Buffer, key: Buffer, iv: Buffer, authTag: Buffer): Buffer {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()])
}
