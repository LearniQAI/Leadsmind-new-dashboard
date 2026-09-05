'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { findOrCreateContactByEmail, findOrCreateEmailConversation } from '@/lib/email/contactConversation';
import { logger } from '@/shared/logger';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface StartEmailConversationResult {
  conversationId: string;
  contactId: string;
  isNewConversation: boolean;
}

/**
 * Communications Hub "Compose new email" gap fix. Before this, every
 * platform:'email' conversation could only ever originate from an inbound
 * reply (Part 1) or Content Studio's sendDocumentToContact() — there was no
 * way for an agent to start a brand-new conversation with a typed address
 * from the inbox itself, which is also why the Email tab never appeared for
 * a workspace with zero existing email conversations.
 *
 * Reuses the exact same find-or-create logic Part 1's inbound webhook
 * already uses (src/lib/email/contactConversation.ts) — contact-based
 * grouping, one platform:'email' conversation per contact, matching every
 * other channel. Does NOT send a message itself: the caller then drives the
 * conversation through the existing sendMessage() path (composer, voice
 * notes, everything already built) exactly like any other conversation.
 */
export async function startEmailConversation(params: {
  toEmail: string;
  toName?: string;
}): Promise<StartEmailConversationResult | { error: string }> {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const toEmail = (params.toEmail || '').trim().toLowerCase();
    if (!EMAIL_PATTERN.test(toEmail)) {
      return { error: 'Enter a valid email address.' };
    }

    const contactResult = await findOrCreateContactByEmail(supabase, workspaceId, toEmail, params.toName);
    if ('error' in contactResult) return { error: contactResult.error };

    const conversationResult = await findOrCreateEmailConversation(
      supabase,
      workspaceId,
      contactResult.id,
      params.toName || toEmail,
    );
    if ('error' in conversationResult) return { error: conversationResult.error };

    logger.info(
      { workspaceId, contactId: contactResult.id, conversationId: conversationResult.id, isNew: conversationResult.isNew },
      'messaging.compose_email.conversation_ready',
    );

    return { conversationId: conversationResult.id, contactId: contactResult.id, isNewConversation: conversationResult.isNew };
  } catch (err: any) {
    logger.error({ err }, 'messaging.compose_email.start_conversation.failed');
    return { error: 'Failed to start conversation' };
  }
}
