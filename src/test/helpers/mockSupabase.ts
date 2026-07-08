import { vi } from 'vitest';

export function createMockSupabaseClient(overrides = {}) {
  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
  });

  const mockRpc = vi.fn().mockResolvedValue({
    data: null,
    error: null,
  });

  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@test.com',
        },
      },
      error: null,
    }),
  };

  return {
    from: mockFrom,
    rpc: mockRpc,
    auth: mockAuth,
    ...overrides,
  };
}

export const TEST_WORKSPACE_ID = 'test-workspace-id-123';
export const TEST_USER_ID = 'test-user-id-456';
export const TEST_CONTACT_ID = 'test-contact-id-789';
