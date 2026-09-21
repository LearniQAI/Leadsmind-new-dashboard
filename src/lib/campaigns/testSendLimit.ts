import type { SupabaseClient } from '@supabase/supabase-js';

// Test sends go out through the workspace's OWN Resend key to any address the
// user types, so they must be capped or they become a bypass around the real
// campaign compliance gates.
export const TEST_SEND_WORKSPACE_LIMIT = 10; // per workspace per hour
export const TEST_SEND_RECIPIENT_LIMIT = 3; // per recipient per workspace per hour
const WINDOW_MS = 60 * 60 * 1000;

export type TestSendSlot = { ok: true } | { ok: false; error: string };

/**
 * Claims one test-send slot. Insert-then-count (not check-then-insert) so
 * parallel bursts can't all pass the check; an over-limit claim removes its own
 * row. Attempts count whether or not the send later succeeds, so retries can't
 * be used to probe. Fails closed if the counter can't be read/written.
 */
export async function claimTestSendSlot(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string | null,
  recipient: string,
): Promise<TestSendSlot> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const to = recipient.trim().toLowerCase();

  const ins = await supabase
    .from('campaign_test_send_events')
    .insert({ workspace_id: workspaceId, user_id: userId, recipient: to })
    .select('id')
    .single();
  if (ins.error || !ins.data) return { ok: false, error: 'Could not verify the test-email limit. Please try again shortly.' };
  const myId = ins.data.id as string;

  const [ws, rc] = await Promise.all([
    supabase.from('campaign_test_send_events').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).gte('created_at', since),
    supabase.from('campaign_test_send_events').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('recipient', to).gte('created_at', since),
  ]);

  const reject = async (error: string): Promise<TestSendSlot> => {
    await supabase.from('campaign_test_send_events').delete().eq('id', myId);
    return { ok: false, error };
  };
  if (ws.error || rc.error) return reject('Could not verify the test-email limit. Please try again shortly.');
  if ((ws.count ?? 0) > TEST_SEND_WORKSPACE_LIMIT) {
    return reject(`Test email limit reached (${TEST_SEND_WORKSPACE_LIMIT} per hour for this workspace). Try again later.`);
  }
  if ((rc.count ?? 0) > TEST_SEND_RECIPIENT_LIMIT) {
    return reject(`Test email limit reached for ${recipient.trim()} (${TEST_SEND_RECIPIENT_LIMIT} per hour). Try again later.`);
  }
  return { ok: true };
}
