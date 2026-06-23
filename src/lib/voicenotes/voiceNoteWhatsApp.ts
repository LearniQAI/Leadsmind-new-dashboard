import { MetaAdapter } from '@/lib/meta/MetaAdapter';
import { createAdminClient } from '@/lib/supabase/server';

interface SenderInfo {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
}

interface SendVoiceNoteWhatsAppProps {
  workspaceId: string;
  toNumber: string;
  sender: SenderInfo;
  audioUrl: string;
}

export async function sendVoiceNoteWhatsApp({
  workspaceId,
  toNumber,
  sender,
  audioUrl
}: SendVoiceNoteWhatsAppProps) {
  const supabase = createAdminClient();

  const { data: conn } = await supabase
    .from('platform_connections')
    .select('credentials')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'whatsapp')
    .maybeSingle();

  if (!conn?.credentials) {
    throw new Error('WhatsApp connection credentials not found');
  }

  const { data: ws } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .maybeSingle();

  const workspaceName = ws?.name || 'LeadsMind';

  const firstName = sender?.first_name || '';
  const lastName = sender?.last_name || '';
  const fullName = sender?.full_name || (firstName || lastName ? `${firstName} ${lastName}`.trim() : null) || 'Team Member';

  const adapter = new MetaAdapter(conn.credentials);
  const textIntro = `Hi, this is ${fullName} from ${workspaceName}. I've sent you a voice note below 👇`;

  // Dispatch the text and audio message via the MetaAdapter
  return adapter.sendWhatsApp(toNumber, textIntro, audioUrl);
}
