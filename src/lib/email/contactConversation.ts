import { logger } from '@/shared/logger';

/**
 * Real, shared find-or-create logic for the Email channel's contact-based
 * conversation grouping (the explicit decision from the Email Channel audit:
 * contact-based, not subject-based, matching every other channel).
 *
 * Used by BOTH real entry points that can originate a `platform:'email'`
 * conversation:
 *  - Inbound: handleInboundWorkspaceEmail() in inboundEmailProcessing.ts
 *    (a stranger emails a workspace's receiving alias).
 *  - Outbound "Compose" (Communications Hub Compose gap, closed): an agent
 *    starts a brand-new conversation with a typed address that may not match
 *    an existing contact.
 *
 * Takes the caller's own Supabase client (admin for the webhook, RLS-scoped
 * for the compose server action — mirrors dispatchOutboundMessage()'s
 * {messagesClient} pattern from the message-delivery-reliability work) so
 * this stays a plain, client-agnostic function rather than assuming a
 * particular auth context.
 */
export async function findOrCreateContactByEmail(
  supabase: any,
  workspaceId: string,
  email: string,
  name?: string | null,
): Promise<{ id: string } | { error: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  const { data: existing } = await supabase
    .from('contacts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('email', normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (existing) return { id: existing.id };

  const { data: created, error } = await supabase
    .from('contacts')
    .insert({
      workspace_id: workspaceId,
      first_name: name || 'Email User',
      last_name: '',
      email: normalizedEmail,
      source: 'email',
    })
    .select('id')
    .single();

  // Lost a race with a concurrent create of the same address (contacts_workspace_id_email_key):
  // the contact exists now — use it rather than failing the email that triggered this.
  if (error && (error as any).code === '23505') {
    const { data: winner } = await supabase
      .from('contacts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('email', normalizedEmail)
      .limit(1)
      .maybeSingle();
    if (winner) return { id: winner.id };
  }

  if (error || !created) {
    logger.error({ err: error, workspaceId, email: normalizedEmail }, 'email.contact_conversation.contact_create_failed');
    return { error: error?.message || 'Failed to create contact' };
  }

  return { id: created.id };
}

/**
 * Find-or-create the (workspace, contact)'s single platform:'email'
 * conversation — one conversation per contact, no external_thread_id, the
 * exact shape sendDocumentToContact() already used before this build.
 */
export async function findOrCreateEmailConversation(
  supabase: any,
  workspaceId: string,
  contactId: string,
  title?: string | null,
  /**
   * When the message being filed was sent. Defaults to now. An older time (Gmail history import)
   * never moves an existing conversation's last_message_at backwards, so an imported old email
   * doesn't jump its thread to the top of the inbox.
   */
  at?: string,
): Promise<{ id: string; isNew: boolean } | { error: string }> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id, last_message_at')
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)
    .eq('platform', 'email')
    .maybeSingle();

  if (existing) {
    const stamp = at || new Date().toISOString();
    if (!at || !existing.last_message_at || new Date(stamp) > new Date(existing.last_message_at)) {
      await supabase.from('conversations').update({ last_message_at: stamp }).eq('id', existing.id);
    }
    return { id: existing.id, isNew: false };
  }

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      platform: 'email',
      title: title || 'Email conversation',
      last_message_at: at || new Date().toISOString(),
    })
    .select('id')
    .single();

  // Lost a race with a concurrent create (conversations_one_email_per_contact): use the winner.
  if (error && (error as any).code === '23505') {
    const { data: winner } = await supabase
      .from('conversations')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('contact_id', contactId)
      .eq('platform', 'email')
      .maybeSingle();
    if (winner) return { id: winner.id, isNew: false };
  }

  if (error || !created) {
    logger.error({ err: error, workspaceId, contactId }, 'email.contact_conversation.conversation_create_failed');
    return { error: error?.message || 'Failed to create conversation' };
  }

  return { id: created.id, isNew: true };
}
