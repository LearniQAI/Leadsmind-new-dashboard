'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';
import {
  META_CHANNELS,
  mapDeliveryRow,
  summariseDeliveryLog,
  type DeliveryLogFilters,
} from '@/lib/messaging/deliveryLog';

// The admin delivery log reads the real Parts 1-2 data (messages + the error
// fields dispatchOutboundMessage() writes into messages.metadata), not a
// separate event ledger. Workspace-scoped via the messages RLS policy.
export async function getMessageDeliveryLog(filters: DeliveryLogFilters = {}) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const limit = Math.min(Math.max(filters.limit ?? 500, 1), 2000);

    let q = supabase
      .from('messages')
      .select('id, external_id, content, status, sent_at, metadata, conversations!inner(platform, title, external_thread_id)')
      .eq('workspace_id', workspaceId)
      .eq('direction', 'outbound')
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (filters.from) q = q.gte('sent_at', filters.from);
    if (filters.to) q = q.lte('sent_at', filters.to);
    if (filters.platform && filters.platform !== 'all') {
      q = q.eq('conversations.platform', filters.platform);
    } else {
      q = q.in('conversations.platform', META_CHANNELS as unknown as string[]);
    }
    if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data || []).map(mapDeliveryRow);
    return { rows, summary: summariseDeliveryLog(rows) };
  } catch (err) {
    logger.error({ err }, 'messaging.delivery_log.fetch.failed');
    return { error: 'Failed to load delivery log' };
  }
}
