import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth'
import { encrypt } from '@/lib/encryption'
import { toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic';

// Workspace webhooks mint new secrets and control outbound delivery targets — restricted
// to admins/owners, same as API keys and integrations.
//
// This reads/writes webhook_endpoints, not workspace_webhooks — webhook_endpoints is the table
// the real dispatcher (src/lib/inngest/functions/webhookDispatch.ts) actually reads from.
// workspace_webhooks was a parallel, never-dispatched table (see 20260725000004 migration).
const ALLOWED_WEBHOOK_ROLES = ['admin', 'owner'];

export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(ALLOWED_WEBHOOK_ROLES);
    const supabase = await createServerClient();

    // Never select the secret column back to the client — same "reveal once, never list"
    // pattern as mintWorkspaceApiKey/createOAuthClient/createWebhook (legacy actions).
    const { data, error } = await supabase
      .from('webhook_endpoints')
      .select('id, url, label, events, active:is_active, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) throw error;
    return NextResponse.json({ webhooks: data ?? [] })
  } catch (err: any) {
    logger.error({ err }, 'settings.webhooks.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(ALLOWED_WEBHOOK_ROLES);
    const supabase = await createServerClient();

    const { url, label } = await req.json()
    if (!url) {
      return NextResponse.json({ error: 'url required' }, { status: 400 })
    }
    // Validate URL format
    try { new URL(url) } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // webhook_endpoints.secret is NOT NULL and is what the dispatcher signs deliveries with —
    // workspace_webhooks never had a secret at all, which was part of why it was a dead end.
    const rawSecret = `whsec_${randomBytes(32).toString('hex')}`;
    const { data, error } = await supabase
      .from('webhook_endpoints')
      .insert({
        workspace_id: workspaceId,
        url,
        label: label ?? url,
        events: ['*'],
        secret: encrypt(rawSecret),
        is_active: true,
      })
      .select('id, url, label, events, active:is_active, created_at')
      .single()

    if (error) throw error;
    // Raw secret is returned once for the user to copy — never persisted in plaintext and
    // never returned again by GET.
    return NextResponse.json({ success: true, webhook: data, secret: rawSecret })
  } catch (err: any) {
    logger.error({ err }, 'settings.webhooks.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { workspaceId } = await requireWorkspaceRole(ALLOWED_WEBHOOK_ROLES);
    const supabase = await createServerClient();

    const { error } = await supabase
      .from('webhook_endpoints')
      .delete()
      .eq("id", id).eq("workspace_id", workspaceId)

    if (error) throw error;
    return NextResponse.json({ success: true })
  } catch (err: any) {
    logger.error({ err }, 'settings.webhooks.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
