import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getWorkspaceNotificationRecipients(
  workspaceId: string,
  assignedToId?: string | null
): Promise<{ emails: string[], phones: string[], uids: string[] }> {
  try {
    const uids = new Set<string>();

    // 1. Fetch workspace owner
    const { data: ws } = await supabaseAdmin
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (ws?.owner_id) {
      uids.add(ws.owner_id);
    }

    // 2. Fetch assigned agent
    if (assignedToId) {
      uids.add(assignedToId);
    }

    // 3. Fetch workspace admins
    const { data: admins } = await supabaseAdmin
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('role', 'admin');

    if (admins) {
      for (const member of admins) {
        uids.add(member.user_id);
      }
    }

    const uidList = Array.from(uids);
    if (uidList.length === 0) return { emails: [], phones: [], uids: [] };

    // 4. Query public.users for their emails and phones
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email, phone')
      .in('id', uidList);

    const emails = users?.map((u: any) => u.email).filter(Boolean) || [];
    const phones = users?.map((u: any) => u.phone).filter(Boolean) || [];
    return { emails, phones, uids: uidList };
  } catch (err) {
    console.error('Error in getWorkspaceNotificationRecipients:', err);
    return { emails: [], phones: [], uids: [] };
  }
}

export async function createInAppNotification(
  userId: string,
  title: string,
  message: string,
  link: string
): Promise<void> {
  try {
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type: 'system',
      link,
      read: false
    });
  } catch (err) {
    console.error('Failed to create in-app notification:', err);
  }
}
