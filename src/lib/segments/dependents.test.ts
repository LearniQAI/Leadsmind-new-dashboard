import { describe, it, expect, vi } from 'vitest';

const h = vi.hoisted(() => ({ rows: {} as Record<string, any[]>, err: null as any, deleted: 0, ack: false }));
vi.mock('@/lib/auth', () => ({ requireWorkspaceAccess: async () => ({ workspaceId: 'ws', userId: 'u' }) }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({
    from: (table: string) => {
      const q: any = {
        select: () => q, eq: () => q, in: () => q,
        delete: () => { h.deleted++; return q; },
        then: (r: any) => r(h.err ? { data: null, error: h.err } : { data: h.rows[table] ?? [], error: null }),
      };
      return q;
    },
  }),
}));

import { findSegmentDependents } from '@/lib/segments/dependents';
import { deleteSegment } from '@/app/actions/segments';

const reset = () => { h.rows = {}; h.err = null; h.deleted = 0; };

describe('findSegmentDependents', () => {
  it('lists email campaigns, auto-senders, SMS and WhatsApp by name; skips finished/cancelled ones', async () => {
    reset();
    h.rows = {
      email_campaigns: [
        { id: '1', name: 'Spring push', status: 'scheduled', segment: { segmentId: 's' } },
        { id: '2', name: 'Welcome drip', status: 'sent', segment: { segmentId: 's', is_automated: true } },
        { id: '3', name: 'Old blast', status: 'sent', segment: { segmentId: 's' } },
        { id: '4', name: 'Dropped', status: 'cancelled', segment: { segmentId: 's' } },
      ],
      bulk_sms_campaigns: [{ id: '5', name: 'SMS promo', status: 'draft' }],
      whatsapp_broadcast_campaigns: [{ id: '6', name: 'WA promo', status: 'scheduled' }],
    };
    const d = await findSegmentDependents((await (await import('@/lib/supabase/server')).createServerClient()), 'ws', 's');
    expect(d.map((x) => [x.kind, x.name])).toEqual([
      ['email_campaign', 'Spring push'], ['auto_sender', 'Welcome drip'], ['sms_campaign', 'SMS promo'], ['whatsapp_campaign', 'WA promo'],
    ]);
  });

  it('throws when the lookup fails (never treats "could not check" as "no dependents")', async () => {
    reset(); h.err = { message: 'boom' };
    await expect(findSegmentDependents((await (await import('@/lib/supabase/server')).createServerClient()), 'ws', 's')).rejects.toBeTruthy();
  });
});

describe('deleteSegment', () => {
  it('does not delete when in use and unacknowledged; returns the dependents', async () => {
    reset();
    h.rows = { email_campaigns: [{ id: '1', name: 'Spring push', status: 'draft', segment: {} }] };
    const res: any = await deleteSegment('s');
    expect(res.success).toBe(false);
    expect(res.requiresConfirmation).toBe(true);
    expect(res.dependents[0].name).toBe('Spring push');
    expect(h.deleted).toBe(0);
  });

  it('deletes when acknowledged, and when nothing depends on it', async () => {
    reset();
    h.rows = { email_campaigns: [{ id: '1', name: 'Spring push', status: 'draft', segment: {} }], segments: [{ id: 's' }] };
    expect((await deleteSegment('s', { acknowledgeDependents: true })).success).toBe(true);
    reset();
    h.rows = { segments: [{ id: 's' }] };
    expect((await deleteSegment('s')).success).toBe(true);
    expect(h.deleted).toBe(1);
  });

  it('reports FAILURE when the delete removed 0 rows (RLS-blocked / already gone), never a silent success', async () => {
    reset();
    h.rows = { segments: [] }; // DELETE ... RETURNING id came back empty
    const res: any = await deleteSegment('s');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/wasn't deleted/);
  });

  it('fails (does not delete) if the dependents check errors', async () => {
    reset(); h.err = { message: 'boom' };
    expect((await deleteSegment('s')).success).toBe(false);
    expect(h.deleted).toBe(0);
  });
});
