import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContactRepository } from './ContactRepository';
import {
  createMockSupabaseClient,
  TEST_WORKSPACE_ID,
  TEST_CONTACT_ID,
} from '@/test/helpers/mockSupabase';

describe('ContactRepository — workspace scoping', () => {
  let mockDb: ReturnType<typeof createMockSupabaseClient>;
  let repo: ContactRepository;

  beforeEach(() => {
    mockDb = createMockSupabaseClient();
    repo = new ContactRepository(mockDb as any);
  });

  it('findById always includes workspace_id in query', async () => {
    const mockContact = {
      id: TEST_CONTACT_ID,
      workspace_id: TEST_WORKSPACE_ID,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@test.com',
    };

    mockDb.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockContact, error: null }),
    });

    await repo.findById(TEST_CONTACT_ID, TEST_WORKSPACE_ID);

    expect(mockDb.from.mock.calls[0][0]).toBe('contacts');

    const eqCalls = mockDb.from().eq.mock.calls;
    const hasWorkspaceScope = eqCalls.some(
      (call: any[]) => call[0] === 'workspace_id' && call[1] === TEST_WORKSPACE_ID
    );
    expect(hasWorkspaceScope).toBe(true);
  });

  it('delete always includes workspace_id in the WHERE clause', async () => {
    mockDb.from.mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    });

    await repo.delete(TEST_CONTACT_ID, TEST_WORKSPACE_ID);

    const eqCalls = mockDb.from().eq.mock.calls;
    const hasWorkspaceScope = eqCalls.some(
      (call: any[]) => call[0] === 'workspace_id' && call[1] === TEST_WORKSPACE_ID
    );
    expect(hasWorkspaceScope).toBe(true);
  });

  it('update always includes workspace_id in the WHERE clause', async () => {
    const mockUpdated = {
      id: TEST_CONTACT_ID,
      workspace_id: TEST_WORKSPACE_ID,
      first_name: 'Jane',
    };

    mockDb.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockUpdated, error: null }),
    });

    await repo.update(TEST_CONTACT_ID, TEST_WORKSPACE_ID, { first_name: 'Jane' });

    const eqCalls = mockDb.from().eq.mock.calls;
    const hasWorkspaceScope = eqCalls.some(
      (call: any[]) => call[0] === 'workspace_id' && call[1] === TEST_WORKSPACE_ID
    );
    expect(hasWorkspaceScope).toBe(true);
  });

  it('search always includes a workspace_id filter', async () => {
    mockDb.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    await repo.search(TEST_WORKSPACE_ID, 'john', 20);

    const eqCalls = mockDb.from().eq.mock.calls;
    const hasWorkspaceScope = eqCalls.some(
      (call: any[]) => call[0] === 'workspace_id' && call[1] === TEST_WORKSPACE_ID
    );
    expect(hasWorkspaceScope).toBe(true);
  });

  it('create always embeds workspace_id in the INSERT payload', async () => {
    const mockCreated = {
      id: TEST_CONTACT_ID,
      workspace_id: TEST_WORKSPACE_ID,
      first_name: 'New',
    };

    const mockInsert = vi.fn().mockReturnThis();
    mockDb.from.mockReturnValue({
      insert: mockInsert,
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockCreated, error: null }),
    });

    await repo.create(TEST_WORKSPACE_ID, {
      first_name: 'New',
      last_name: 'Contact',
      email: 'new@test.com',
    });

    const insertPayload = mockInsert.mock.calls[0][0];
    expect(insertPayload.workspace_id).toBe(TEST_WORKSPACE_ID);
  });

  it('cannot delete a contact from a different workspace', async () => {
    const DIFFERENT_WORKSPACE = 'different-workspace-id';

    const mockEq = vi.fn().mockReturnThis();
    mockDb.from.mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: mockEq,
    });

    await repo.delete(TEST_CONTACT_ID, DIFFERENT_WORKSPACE);

    const workspaceCalls = mockEq.mock.calls.filter((call: any[]) => call[0] === 'workspace_id');

    expect(workspaceCalls.length).toBeGreaterThan(0);
    expect(workspaceCalls[0][1]).toBe(DIFFERENT_WORKSPACE);
    expect(workspaceCalls[0][1]).not.toBe(TEST_WORKSPACE_ID);
  });
});
