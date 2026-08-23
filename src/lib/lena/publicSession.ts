import { createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

export type LenaVisitorSession = {
  workspaceId: string;
  visitorId: string;
  conversationId: string;
  origin: string;
  exp: number;
};

const SESSION_TTL_SECONDS = 60 * 60 * 24;

function secret(): string {
  const value = process.env.LENA_VISITOR_SESSION_SECRET;
  if (!value) throw new Error('LENA_VISITOR_SESSION_SECRET is not configured');
  return value;
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

function sign(encodedPayload: string) {
  return createHmac('sha256', secret()).update(encodedPayload).digest('base64url');
}

export function issueLenaVisitorSession(input: Omit<LenaVisitorSession, 'exp'>) {
  const payload: LenaVisitorSession = { ...input, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const encoded = base64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifyLenaVisitorSession(token: string | null | undefined): LenaVisitorSession | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, suppliedSignature] = token.split('.');
  if (!encoded || !suppliedSignature) return null;
  const expectedSignature = sign(encoded);
  if (suppliedSignature.length !== expectedSignature.length || !timingSafeEqual(Buffer.from(suppliedSignature), Buffer.from(expectedSignature))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as LenaVisitorSession;
    if (!payload.workspaceId || !payload.visitorId || !payload.conversationId || !payload.origin || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function visitorSessionFromRequest(req: NextRequest) {
  return req.headers.get('x-lena-visitor-session') || req.nextUrl.searchParams.get('visitorSession');
}

export function requestOrigin(req: NextRequest): string | null {
  const value = req.headers.get('origin') || req.headers.get('referer');
  if (!value) return null;
  try { return new URL(value).origin; } catch { return null; }
}

export function requestIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

export function fingerprint(req: NextRequest, workspaceId: string, origin: string) {
  const material = `${requestIp(req)}\n${req.headers.get('user-agent') || ''}\n${workspaceId}\n${origin}`;
  return createHmac('sha256', secret()).update(material).digest('hex');
}

export function ipHash(req: NextRequest) {
  return createHmac('sha256', secret()).update(requestIp(req)).digest('hex');
}
