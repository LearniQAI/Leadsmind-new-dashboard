import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth'
import { encrypt } from '@/lib/encryption'
import { stripe } from '@/lib/stripe'
import { toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic';

// Viewing/connecting/disconnecting integrations exposes webhook secrets and third-party
// account state — restricted to workspace admins/owners, same as API keys.
const ALLOWED_INTEGRATIONS_ROLES = ['admin', 'owner'];

// GET — fetch all integrations for the caller's own workspace
export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(ALLOWED_INTEGRATIONS_ROLES);
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('workspace_integrations')
      .select('provider, category, connected, account_label, connected_at')
      .eq('workspace_id', workspaceId)

    if (error) throw error;
    return NextResponse.json({ integrations: data ?? [] })
  } catch (err: any) {
    logger.error({ err }, 'settings.integrations.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// POST — mark an integration as connected
export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(ALLOWED_INTEGRATIONS_ROLES);
    const supabase = await createServerClient();

    const { provider, category, accountLabel, webhookUrl, credentials } = await req.json()
    if (!provider || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // If automation platform and webhookUrl is provided, create a webhook_endpoint.
    // webhook_endpoints has RLS enabled but no policies defined, so the admin client is
    // required here — access is still gated by the workspaceId resolved above, never client input.
    if (category === 'automation' && webhookUrl && webhookUrl.startsWith('http')) {
      const adminClient = createAdminClient();
      const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`

      const { data: existing } = await adminClient
        .from('webhook_endpoints')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('url', webhookUrl)
        .maybeSingle()

      if (!existing) {
        await adminClient.from('webhook_endpoints').insert({
          workspace_id: workspaceId,
          url: webhookUrl,
          events: ['contact.created', 'deal.won', 'invoice.paid', 'form.submitted'],
          secret,
          is_active: true
        })
      }
    }

    // Payment-gateway credentials (e.g. PayFast's merchant key/passphrase) were previously
    // dropped entirely — only the account label ever reached this route, so a merchant who
    // filled in the form and clicked Connect got a UI that looked connected but had stored
    // nothing usable. Every secret value is encrypted at rest with the same AES-256-CBC
    // helper already used for bank connection credentials (src/lib/encryption.ts).
    let storedCredentials: Record<string, string> | undefined;
    if (category === 'payment_gateway') {
      const apiKey = credentials?.apiKey?.trim();
      const apiSecret = credentials?.apiSecret?.trim();
      const passphrase = credentials?.passphrase?.trim();

      if (!apiKey || !apiSecret) {
        return NextResponse.json({ error: 'API Key and API Secret are required' }, { status: 400 })
      }

      storedCredentials = {
        api_key_encrypted: encrypt(apiKey),
        api_secret_encrypted: encrypt(apiSecret),
      };
      if (passphrase) {
        storedCredentials.passphrase_encrypted = encrypt(passphrase);
      }
    }

    const upsertPayload: Record<string, any> = {
      workspace_id: workspaceId,
      provider,
      category,
      connected: true,
      account_label: accountLabel ?? null,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (storedCredentials) {
      upsertPayload.credentials = storedCredentials;
    }

    const { error } = await supabase
      .from('workspace_integrations')
      .upsert(upsertPayload, { onConflict: 'workspace_id,provider' })

    if (error) throw error;
    return NextResponse.json({ success: true })
  } catch (err: any) {
    logger.error({ err }, 'settings.integrations.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// DELETE — disconnect an integration
export async function DELETE(req: NextRequest) {
  try {
    const provider = req.nextUrl.searchParams.get('provider')
    if (!provider) {
      return NextResponse.json({ error: 'provider required' }, { status: 400 })
    }

    const { workspaceId } = await requireWorkspaceRole(ALLOWED_INTEGRATIONS_ROLES);
    const supabase = await createServerClient();
    const adminClient = createAdminClient();

    // Deactivate associated webhook endpoints
    let domainPattern = ''
    if (provider.toLowerCase() === 'zapier') domainPattern = 'zapier.com'
    else if (provider.toLowerCase() === 'make.com') domainPattern = 'make.com'
    else if (provider.toLowerCase() === 'n8n') domainPattern = 'n8n'
    else if (provider.toLowerCase() === 'pabbly connect') domainPattern = 'pabbly'

    if (domainPattern) {
      const { data: hooks } = await adminClient
        .from('webhook_endpoints')
        .select('id, url')
        .eq('workspace_id', workspaceId)

      if (hooks) {
        const matchIds = hooks
          .filter(h => h.url && h.url.toLowerCase().includes(domainPattern))
          .map(h => h.id)

        if (matchIds.length > 0) {
          await adminClient
            .from('webhook_endpoints')
            .delete()
            .in('id', matchIds)
        }
      }
    }

    // Best-effort revoke on Stripe's side before wiping local state — if this fails (e.g.
    // already revoked from Stripe's dashboard), disconnecting locally should still proceed.
    if (provider.toLowerCase() === 'stripe') {
      const { data: existing } = await adminClient
        .from('workspace_integrations')
        .select('credentials')
        .eq('workspace_id', workspaceId)
        .eq('provider', provider)
        .maybeSingle();

      const stripeUserId = (existing?.credentials as any)?.stripe_user_id;
      if (stripeUserId && process.env.STRIPE_CONNECT_CLIENT_ID) {
        try {
          await stripe.oauth.deauthorize({
            client_id: process.env.STRIPE_CONNECT_CLIENT_ID,
            stripe_user_id: stripeUserId,
          });
        } catch (deauthErr) {
          logger.warn({ err: deauthErr, workspaceId }, 'settings.integrations.stripe_deauthorize.failed');
        }
      }
    }

    // Previously left any stored credentials in place, only flipping the connected flag —
    // meaning a "disconnected" integration still had its real secret sitting in the row.
    const { error } = await supabase
      .from('workspace_integrations')
      .update({
        connected: false,
        account_label: null,
        connected_at: null,
        credentials: {},
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', workspaceId)
      .eq('provider', provider)

    if (error) throw error;
    return NextResponse.json({ success: true })
  } catch (err: any) {
    logger.error({ err }, 'settings.integrations.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
