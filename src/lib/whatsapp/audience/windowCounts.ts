// How many of an audience's eligible recipients currently have an open WhatsApp 24-hour customer-service window.
// Read-only. Uses the same clock the dispatch worker uses (conversations.last_customer_message_at, per contact, for
// platform = 'whatsapp') and the same helper, so the preview agrees with what the worker will do at send time.
import { isWithinWhatsAppSessionWindow } from '@/lib/meta/whatsappWindow';

const ID_CHUNK = 100;

export interface WindowCounts {
  open: number;
  closed: number;
}

export async function countWindowStatus(db: any, workspaceId: string, contactIds: string[]): Promise<WindowCounts> {
  const latest = new Map<string, string>();
  for (let i = 0; i < contactIds.length; i += ID_CHUNK) {
    const { data, error } = await db.from('conversations')
      .select('contact_id, last_customer_message_at')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'whatsapp')
      .in('contact_id', contactIds.slice(i, i + ID_CHUNK));
    if (error) throw error; // fail closed: never guess the window
    for (const r of data ?? []) {
      if (!r.last_customer_message_at) continue;
      const prev = latest.get(r.contact_id);
      if (!prev || r.last_customer_message_at > prev) latest.set(r.contact_id, r.last_customer_message_at);
    }
  }
  let open = 0;
  for (const id of contactIds) if (isWithinWhatsAppSessionWindow(latest.get(id))) open++;
  return { open, closed: contactIds.length - open };
}
