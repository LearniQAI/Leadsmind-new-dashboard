import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

import { createServerClient } from '@supabase/ssr';
import { requireAuth } from './requireAuth';

function buildRequest() {
  return new NextRequest('https://example.com/api/test');
}

describe('requireAuth — returns 401 for unauthenticated requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a 401 response when no user session exists', async () => {
    (createServerClient as any).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'No user' },
        }),
      },
    });

    const result: any = await requireAuth(buildRequest());

    expect(result.status).toBe(401);
    const body = await result.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns the user object when authenticated', async () => {
    (createServerClient as any).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@test.com' } },
          error: null,
        }),
      },
    });

    const result: any = await requireAuth(buildRequest());

    expect(result.id).toBe('user-123');
    expect(result.status).toBeUndefined();
  });

  it('does not return a 401 for authenticated users', async () => {
    (createServerClient as any).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const result: any = await requireAuth(buildRequest());
    expect(result.status).not.toBe(401);
  });
});
