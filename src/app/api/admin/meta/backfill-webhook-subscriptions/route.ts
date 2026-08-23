import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requirePlatformOperator } from '@/lib/auth/platformOperator';
import { ForbiddenError, UnauthorizedError } from '@/shared/errors/AppError';
import { decrypt } from '@/lib/encryption';
import { logger } from '@/shared/logger';
import { subscribePageToMetaWebhook } from '@/lib/meta/subscribeWebhook';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// One-time remediation for the missing-subscribed_apps bug (see
// src/app/api/auth/meta/callback/route.ts): every Facebook/Instagram platform_connections row
// created before that fix shipped has a valid, stored Page access token but was never linked to
// our app's webhook, so it silently receives zero Messenger/Instagram events. This loops those
// existing rows and applies the same subscribePageToMetaWebhook call the OAuth callback now
// makes on every new connect, without requiring every workspace to manually disconnect/
// reconnect. Page access tokens obtained via Facebook Login for Business are long-lived
// (non-expiring, refreshed by re-auth if the user changes their FB password / revokes access) —
// they are not automatically expired by the passage of time, so this is expected to work for
// active connections. Rows where the call fails (e.g. token was actually revoked) are marked
// status:'error' the same way a failed live connect is, so they surface in the Integrations UI
// instead of continuing to look silently healthy.
//
// This operates on every tenant's encrypted connection. It is a platform-operator
// maintenance action, never a per-workspace self-service action.
export async function POST() {
  try {
    await requirePlatformOperator();

    const { data: rows, error } = await supabase
      .from('platform_connections')
      .select('id, workspace_id, platform, credentials, status')
      .in('platform', ['facebook', 'instagram']);

    if (error) throw error;

    // Facebook and Instagram rows for the same workspace share the same page_id + page token —
    // only call subscribed_apps once per unique Page, then apply the result to both rows.
    const subscribeResultByPageId = new Map<string, { success: boolean; error?: string }>();
    const results: Array<{
      workspaceId: string;
      platform: string;
      pageId: string | null;
      success?: boolean;
      error?: string;
      skipped?: boolean;
      reason?: string;
    }> = [];

    for (const row of rows || []) {
      const creds = (row.credentials as any) || {};
      const pageId: string | undefined = creds.page_id;
      const encryptedToken: string | undefined = creds.page_access_token_encrypted;

      if (!pageId || !encryptedToken) {
        results.push({ workspaceId: row.workspace_id, platform: row.platform, pageId: pageId ?? null, skipped: true, reason: 'missing page_id or page_access_token_encrypted' });
        continue;
      }

      let subResult = subscribeResultByPageId.get(pageId);
      if (!subResult) {
        try {
          const pageAccessToken = decrypt(encryptedToken);
          subResult = await subscribePageToMetaWebhook(pageId, pageAccessToken);
        } catch (decryptErr: any) {
          subResult = { success: false, error: `token decrypt failed: ${decryptErr.message}` };
        }
        subscribeResultByPageId.set(pageId, subResult);
      }

      const { error: updateErr } = await supabase
        .from('platform_connections')
        .update({
          status: subResult.success ? 'connected' : 'error',
          credentials: {
            ...creds,
            health_status: subResult.success ? 'connected' : 'webhook_subscription_failed',
            ...(subResult.success ? { webhook_subscription_error: undefined } : { webhook_subscription_error: subResult.error }),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      if (updateErr) {
        logger.error({ err: updateErr, rowId: row.id }, 'meta.webhook_backfill.row_update_failed');
      }

      results.push({ workspaceId: row.workspace_id, platform: row.platform, pageId, success: subResult.success, error: subResult.error });

      if (!subResult.success) {
        logger.error({ workspaceId: row.workspace_id, platform: row.platform, pageId, err: subResult.error }, 'meta.webhook_backfill.subscribe_failed');
      } else {
        logger.info({ workspaceId: row.workspace_id, platform: row.platform, pageId }, 'meta.webhook_backfill.subscribe_succeeded');
      }
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
    logger.error({ err: error }, 'meta.webhook_backfill.failed');
    return NextResponse.json({ error: error.message || 'Backfill failed' }, { status: 500 });
  }
}
