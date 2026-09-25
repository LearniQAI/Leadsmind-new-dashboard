import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeEmail } from '@/app/actions/popia';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const params = (req: NextRequest) => {
  const q = req.nextUrl.searchParams;
  return { email: q.get('email') || '', workspaceId: q.get('workspace_id') || '', token: q.get('token') || '' };
};

/**
 * RFC 8058 one-click unsubscribe target (the List-Unsubscribe header on bulk mail). The mail
 * client POSTs here directly; the signed token (same as the page link) is the authorization.
 */
export async function POST(req: NextRequest) {
  const { email, workspaceId, token } = params(req);
  const res = await unsubscribeEmail(email, workspaceId, token);
  if (!res.success) return NextResponse.json({ error: 'Invalid or expired unsubscribe link.' }, { status: 400 });
  return NextResponse.json({ unsubscribed: true });
}

/** A human opening the header URL gets the normal confirmation page (no state change on GET). */
export async function GET(req: NextRequest) {
  const url = new URL('/public/unsubscribe', req.nextUrl.origin);
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));
  return NextResponse.redirect(url, 303);
}
