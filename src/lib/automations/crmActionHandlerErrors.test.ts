import { describe, it, expect, vi, beforeEach } from 'vitest';

const logErr = vi.fn();
const state = { throwOnTable: null as string | null };
const DB_ERROR = { message: 'duplicate key value violates unique constraint "contact_tasks_pkey"', code: '23505', details: 'Key (id)=(1) already exists.' };
const SENSITIVE = 'connect ECONNREFUSED 10.0.0.5:5432 password authentication failed for user "svc_admin"';

vi.mock('@/shared/logger', () => ({ logger: { error: (...a: any[]) => logErr(...a), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/crm/UnifiedActivityEngine', () => ({ UnifiedActivityEngine: { logActivity: vi.fn() } }));
vi.mock('@/modules/tags/sync/syncContactTags', () => ({ syncContactTagsToRelational: vi.fn(async () => {}) }));
vi.mock('@/lib/twilio/resolveWorkspaceTwilioCredentials', () => ({ resolveWorkspaceTwilioCredentials: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from(table: string) {
      if (state.throwOnTable === table) throw new Error(SENSITIVE);
      // The pipeline stage lookup succeeds so updatePipelineStage reaches its DB write;
      // every other query fails with a Postgres-style error.
      const result = table === 'pipeline_stages' ? { data: { id: 's1' }, error: null } : { data: null, error: DB_ERROR };
      const q: any = {
        select: () => q, insert: () => q, update: () => q, eq: () => q,
        single: () => Promise.resolve(result),
        maybeSingle: () => Promise.resolve(result),
        then: (r: any) => r(result),
      };
      return q;
    },
  }),
}));

import { CRMActionHandler } from '@/lib/automations/CRMActionHandler';

const payload = { workspaceId: 'w1', contactId: 'c1', formName: 'F', values: { name: 'N' } };
const MASKED = 'The CRM action could not be completed.';
const run = (type: string, config: any = {}) => CRMActionHandler.executeAction(type, config, payload);

beforeEach(() => { logErr.mockReset(); state.throwOnTable = null; });

describe('CRMActionHandler: raw Postgres errors never reach the persisted step error', () => {
  it.each([
    ['create_task', {}],
    ['assign_owner', { ownerId: 'o1' }],
    ['update_pipeline', { stageId: 's1' }],
    ['apply_tags', { tags: ['vip'] }],
    ['create_note', { content: 'hi' }],
    ['update_fields', {}],
    ['create_reminder', { title: 'T' }],
  ])('%s: masks a DB error and logs the real one', async (type, config) => {
    const r: any = await run(type, config);
    expect(r).toEqual({ success: false, error: MASKED });
    expect(JSON.stringify(r)).not.toMatch(/duplicate key|contact_tasks_pkey|23505|Key \(id\)/);
    expect(logErr).toHaveBeenCalledWith(expect.objectContaining({ err: DB_ERROR, action: type }), 'crm_action.failed');
  });

  it('catch-all: an exception thrown mid-action is masked and logged', async () => {
    state.throwOnTable = 'contact_notes';
    const r: any = await run('create_note', { content: 'hi' });
    expect(r).toEqual({ success: false, error: MASKED });
    expect(JSON.stringify(r)).not.toMatch(/ECONNREFUSED|svc_admin|10\.0\.0\.5/);
    expect(logErr).toHaveBeenCalledWith(expect.objectContaining({ err: expect.objectContaining({ message: SENSITIVE }), action: 'create_note' }), 'crm_action.failed');
  });

  it('keeps the handler\'s own literal, deliberately user-facing errors', async () => {
    expect(await CRMActionHandler.executeAction('nope', {}, payload)).toEqual({ success: false, error: 'Unsupported CRM action type: nope' });
  });
});
