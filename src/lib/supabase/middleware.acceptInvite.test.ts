import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Regression cover for: an already-logged-in user clicking a team invite link
// was silently redirected to /dashboard by the blanket "user && isAuthPage"
// rule, so the accept-invite page's own logic never ran.

let currentUser: { id: string; email: string } | null = null;

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: currentUser } }),
      signOut: async () => ({}),
    },
  }),
}));

import { updateSession } from './middleware';

function req(path: string) {
  return new NextRequest(new URL(`https://www.leadsmind.io${path}`), {
    headers: { host: 'www.leadsmind.io' },
  });
}

describe('updateSession — accept-invite is reachable while logged in', () => {
  beforeEach(() => {
    currentUser = null;
  });

  it('does NOT redirect a logged-in user away from /auth/accept-invite, and keeps the token', async () => {
    currentUser = { id: 'u1', email: 'someone@example.com' };
    const res = await updateSession(req('/auth/accept-invite?token=abc-123'));
    // NextResponse.next() has no location header; a redirect would.
    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
  });

  it('still redirects a logged-in user away from other /auth pages', async () => {
    currentUser = { id: 'u1', email: 'someone@example.com' };
    const res = await updateSession(req('/auth/signin-basic'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/dashboard');
  });

  it('still lets a logged-out user reach /auth/accept-invite (public)', async () => {
    currentUser = null;
    const res = await updateSession(req('/auth/accept-invite?token=abc-123'));
    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
  });
});
