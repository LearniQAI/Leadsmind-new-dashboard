import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';
import { EmailSendError } from './errors';
import { checkManagedFromDomain, claimSendQuota, recordSentEvent, verifyManagedSenderToken } from './managedSender';

/**
 * Everything sendEmail needs for a LeadsMind-managed send, resolved before the provider call:
 * token authenticity, the send-time domain gate, the rate-limit claim, and the platform key.
 * Loaded lazily by sendEmail so BYO/platform sends never touch the database.
 */
export async function prepareManagedSend(token: string, fromAddress: string) {
  const workspaceId = verifyManagedSenderToken(token);
  if (!workspaceId) throw new EmailSendError('Email delivery is unavailable for this workspace: its sender credentials are invalid.');

  const providerApiKey = process.env.RESEND_API_KEY?.trim();
  if (!providerApiKey) throw new EmailSendError('Email delivery is unavailable: the LeadsMind email service is not configured.');

  const db = createAdminClient();
  const gate = await checkManagedFromDomain(db as any, workspaceId, fromAddress);
  if (gate.ok === false) throw new EmailSendError(gate.reason);
  await claimSendQuota(db as any, workspaceId, gate.domain);

  return {
    workspaceId,
    providerApiKey,
    // Echoed back on every webhook event; attribution itself keys off the provider message id.
    tags: [
      { name: 'workspace_id', value: workspaceId },
      { name: 'sender_domain_id', value: gate.domain.id },
    ],
    async recordSent(messageId: string, recipient: string, tags?: { name: string; value: string }[]) {
      // The email has already gone out; a logging failure must not report the send as failed.
      try {
        await recordSentEvent(db as any, {
          workspaceId,
          senderDomainId: gate.domain.id,
          provider: 'resend',
          messageId,
          recipient,
          tags,
        });
      } catch (err) {
        logger.error({ err, workspaceId, messageId }, 'email.managed.sent_event.failed');
      }
    },
  };
}
