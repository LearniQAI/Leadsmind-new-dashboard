import { SignJWT, jwtVerify } from 'jose';

const getSecretKey = () => {
  const secret = process.env.JWT_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_URL || 'default_fallback_secret_key_leadsmind_forms';
  return new TextEncoder().encode(secret);
};

export interface PrefillPayload {
  workspaceId: string;
  contactId: string;
  email?: string;
  exp?: number;
}

export async function generatePrefillToken(payload: Omit<PrefillPayload, 'exp'>, expiresInSeconds: number = 86400 * 30): Promise<string> {
  const alg = 'HS256';
  
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(getSecretKey());
}

export async function verifyPrefillToken(token: string): Promise<PrefillPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as PrefillPayload;
  } catch (error) {
    console.error('[PrefillToken] Verification failed:', error);
    return null;
  }
}
