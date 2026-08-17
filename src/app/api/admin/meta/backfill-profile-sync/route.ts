import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { ForbiddenError, UnauthorizedError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { MetaAdapter } from '@/lib/meta/MetaAdapter';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// One-time remediation for conversations/contacts created before real-name/avatar sync
// shipped (see src/app/api/webhooks/meta/route.ts's syncContactProfile): every Facebook/
// Instagram contact still carrying the "{Platform} User {id}" placeholder never got a live
// profile fetch, because that only runs on first contact or a >30-day-old sync. This loops
// those contacts, calls the same fetchFacebookProfile/fetchInstagramProfile used by the
// webhook, and applies the result the same way — placeholder detection, profile_synced_at
// stamping regardless of outcome, and a distinguishable log line on fallback.
//
// Same cross-tenant gating rationale as backfill-webhook-subscriptions: there's no
// platform-staff role, so this is gated to admin/owner of *some* workspace and must be
// triggered manually, not run automatically.
const ALLOWED_ROLES = ['admin', 'owner'];

function isPlaceholderName(firstName: string | null, lastName: string | null, platformLabel: string, senderId: string): boolean {
  return firstName === `${platformLabel} User` && lastName === senderId.substring(0, 8);
}

export async function POST() {
  try {
    await requireWorkspaceRole(ALLOWED_ROLES);

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, workspace_id, platform, external_thread_id, contact_id, contacts(id, first_name, last_name)')
      .in('platform', ['facebook', 'instagram']);

    if (error) throw error;

    const connectionCache = new Map<string, any>();
    const results: Array<{
      conversationId: string;
      workspaceId: string;
      platform: string;
      contactId: string;
      success?: boolean;
      error?: string;
      skipped?: boolean;
      reason?: string;
    }> = [];

    for (const conv of conversations || []) {
      const contact: any = conv.contacts;
      const platformLabel = conv.platform === 'facebook' ? 'Facebook' : 'Instagram';

      if (!contact || !isPlaceholderName(contact.first_name, contact.last_name, platformLabel, conv.external_thread_id)) {
        continue; // already has a real synced name, nothing to backfill
      }

      const cacheKey = `${conv.platform}:${conv.workspace_id}`;
      let connection = connectionCache.get(cacheKey);
      if (connection === undefined) {
        const { data } = await supabase
          .from('platform_connections')
          .select('credentials')
          .eq('workspace_id', conv.workspace_id)
          .eq('platform', conv.platform)
          .limit(1)
          .maybeSingle();
        connection = data || null;
        connectionCache.set(cacheKey, connection);
      }

      if (!connection?.credentials) {
        results.push({ conversationId: conv.id, workspaceId: conv.workspace_id, platform: conv.platform, contactId: contact.id, skipped: true, reason: 'no platform_connections credentials found' });
        continue;
      }

      const adapter = new MetaAdapter(connection.credentials);
      const update: any = { profile_synced_at: new Date().toISOString() };
      let success = false;
      let errorMsg: string | undefined;

      if (conv.platform === 'facebook') {
        const profile = await adapter.fetchFacebookProfile(conv.external_thread_id);
        if (profile.success && (profile.firstName || profile.lastName)) {
          update.first_name = profile.firstName || '';
          update.last_name = profile.lastName || '';
          if (profile.profilePicUrl) update.avatar_url = profile.profilePicUrl;
          success = true;
        } else {
          errorMsg = profile.error;
        }
      } else {
        const profile = await adapter.fetchInstagramProfile(conv.external_thread_id);
        if (profile.success && profile.name) {
          const [firstName, ...rest] = profile.name.split(' ');
          update.first_name = firstName || profile.name;
          update.last_name = rest.join(' ');
          if (profile.profilePicUrl) update.avatar_url = profile.profilePicUrl;
          success = true;
        } else {
          errorMsg = profile.error;
        }
      }

      const { error: contactUpdateErr } = await supabase.from('contacts').update(update).eq('id', contact.id);
      if (contactUpdateErr) {
        logger.error({ err: contactUpdateErr, contactId: contact.id }, 'meta.profile_backfill.contact_update_failed');
      }

      if (success) {
        await supabase.from('conversations').update({ title: `${update.first_name} ${update.last_name}`.trim() }).eq('id', conv.id);
        logger.info({ conversationId: conv.id, contactId: contact.id, platform: conv.platform }, 'meta.profile_backfill.succeeded');
      } else {
        logger.warn({ conversationId: conv.id, contactId: contact.id, platform: conv.platform, reason: errorMsg }, 'meta.profile_backfill.fallback_placeholder');
      }

      results.push({ conversationId: conv.id, workspaceId: conv.workspace_id, platform: conv.platform, contactId: contact.id, success, error: errorMsg });
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => r.success === false).length;
    const skipped = results.filter(r => r.skipped).length;

    return NextResponse.json({ success: true, processed: results.length, succeeded, failed, skipped, results });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error({ err: error }, 'meta.profile_backfill.failed');
    return NextResponse.json({ error: error.message || 'Backfill failed' }, { status: 500 });
  }
}
