import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_USER_ID } from '@/test/helpers/mockSupabase';

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

import { createServerClient } from '@/lib/supabase/server';
import { setupWorkspace } from '@/app/actions/auth';

/**
 * setupWorkspace (src/app/actions/auth.ts) now delegates workspace + admin
 * membership creation to the atomic `setup_workspace` RPC (Migration 4),
 * instead of two sequential, non-transactional inserts. This mirrors that
 * real call sequence.
 */
function buildMockDb(
  opts: {
    hasMembership?: boolean;
    rpcError?: { message: string } | null;
    rpcWorkspaceId?: string;
  } = {}
) {
  const userUpsert = vi.fn().mockResolvedValue({ error: null });
  const membershipSingle = vi.fn().mockResolvedValue({
    data: opts.hasMembership
      ? { workspace_id: 'existing-ws-id', workspaces: { id: 'existing-ws-id', name: 'Existing' } }
      : null,
    error: null,
  });
  const rpc = vi.fn().mockResolvedValue(
    opts.rpcError
      ? { data: null, error: opts.rpcError }
      : { data: opts.rpcWorkspaceId ?? 'new-ws-id', error: null }
  );

  const from = vi.fn((table: string) => {
    if (table === 'users') return { upsert: userUpsert };
    if (table === 'workspace_members') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: membershipSingle,
      };
    }
    throw new Error(`unexpected table: ${table}`);
  });

  return { from, rpc, userUpsert, membershipSingle };
}

describe('setupWorkspace — atomic via setup_workspace RPC', () => {
  const payload = {
    userId: TEST_USER_ID,
    email: 'test@test.com',
    firstName: 'Test',
    lastName: 'User',
    workspaceName: "Test's Workspace",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a workspace via the RPC and returns its id when the user has no existing membership', async () => {
    const mockDb = buildMockDb({ hasMembership: false });
    (createServerClient as any).mockResolvedValue(mockDb);

    const result = await setupWorkspace(payload);

    expect(result.success).toBe(true);
    expect(result.workspaceId).toBe('new-ws-id');
    expect(mockDb.userUpsert).toHaveBeenCalled();
    expect(mockDb.rpc).toHaveBeenCalledWith(
      'setup_workspace',
      expect.objectContaining({ p_user_id: TEST_USER_ID })
    );
  });

  it('returns the existing workspace id without calling the RPC if membership already exists', async () => {
    const mockDb = buildMockDb({ hasMembership: true });
    (createServerClient as any).mockResolvedValue(mockDb);

    const result = await setupWorkspace(payload);

    expect(result.success).toBe(true);
    expect(result.workspaceId).toBe('existing-ws-id');
    expect(mockDb.rpc).not.toHaveBeenCalled();
  });

  it('returns a failure result when the RPC errors, with no partial workspace/member state to clean up', async () => {
    const mockDb = buildMockDb({ rpcError: { message: 'transaction rolled back' } });
    (createServerClient as any).mockResolvedValue(mockDb);

    const result = await setupWorkspace(payload);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('calls the RPC with the real setup_workspace param shape (user id, workspace name, slug)', async () => {
    const mockDb = buildMockDb({});
    (createServerClient as any).mockResolvedValue(mockDb);

    await setupWorkspace(payload);

    expect(mockDb.rpc).toHaveBeenCalledWith('setup_workspace', {
      p_user_id: payload.userId,
      p_workspace_name: payload.workspaceName,
      p_slug: expect.any(String),
    });
  });
});
