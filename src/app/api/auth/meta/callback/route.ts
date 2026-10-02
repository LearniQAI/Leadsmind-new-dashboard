import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/encryption'
import { consumeOAuthStateNonce } from '@/lib/oauth/stateNonce'
import { OAuthFlowError, providerFetch, readJson, safeErrorInfo, failureCodeOf, socialConnectionsRedirect, type OAuthFailureCode } from '@/lib/oauth/socialOAuth'
import { logger } from '@/shared/logger'
import { subscribePageToMetaWebhook } from '@/lib/meta/subscribeWebhook'
import { inngest } from '@/lib/inngest'
import { newRequestId } from '@/shared/logger/requestId'
import { createStepTimer, logRequestComplete } from '@/shared/logger/requestTiming'

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const REDIRECT_BASE = process.env.NEXT_PUBLIC_APP_URL
  ?? 'https://leadsmind-new-dashboard.vercel.app'

// /settings/integrations is not a real route — the Messaging Integrations UI (which parses
// meta_oauth/needs_instagram/needs_whatsapp and opens the account picker) lives at the
// 'integrations' tab of /settings, same convention as every other /settings?tab=X redirect
// in this app (billing, ai, ai-credits).
const INTEGRATIONS_REDIRECT_PATH = '/settings?tab=integrations'

export async function GET(req: Request) {
  // Browser redirect, not a client fetch — request_id is generated server-side and the query
  // string (code/state) is never logged, only the static route name/status/steps/sanitized error.
  const requestId = newRequestId()
  const timer = createStepTimer()
  let workspaceIdForLog: string | null = null
  let status = 302
  let failure: unknown
  const finish = () => logRequestComplete({
    requestId,
    route: '/api/auth/meta/callback',
    method: 'GET',
    status,
    durationMs: timer.totalMs(),
    steps: timer.steps(),
    workspaceId: workspaceIdForLog,
    error: failure,
  })

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const stateStr = searchParams.get('state') ?? ''
  const errorParam = searchParams.get('error')

  let workspaceId = ''
  let platform: 'facebook' | 'instagram' | 'whatsapp' = 'facebook'
  let returnTo: 'social' | 'settings' = 'settings'

  // Where to send the user: the Social connections page when the flow started there, otherwise
  // the Settings integrations tab (which has its own meta_oauth query contract).
  const fail = (error: OAuthFailureCode) => returnTo === 'social'
    ? socialConnectionsRedirect(platform, { error }, '/social/connections')
    : NextResponse.redirect(`${REDIRECT_BASE}${INTEGRATIONS_REDIRECT_PATH}&meta_oauth=1&error=${error}`)

  // Resolve the state first (also on denial — Meta echoes `state` back) so we know where to return.
  if (stateStr) {
    try {
      // state is a random opaque nonce minted at flow-initiation time, bound server-side to
      // the real authenticated user + their real workspace (+ which sub-platform was
      // requested, in `extra`) — never trust the raw state value as workspace_id/platform.
      const { workspaceId: resolvedWorkspaceId, extra } = await consumeOAuthStateNonce(stateStr, 'meta')
      workspaceId = resolvedWorkspaceId
      workspaceIdForLog = workspaceId
      platform = (extra.platform ?? 'facebook') as typeof platform
      returnTo = extra.returnTo === 'social' ? 'social' : 'settings'
      timer.mark('state_nonce_verify')
    } catch (nonceErr) {
      status = 400
      failure = nonceErr
      logger.error(safeErrorInfo(nonceErr), 'meta_oauth.state_nonce.invalid')
      finish()
      return fail('invalid_state')
    }
  }

  // User cancelled or denied access
  if (errorParam) {
    status = 400
    finish()
    return fail('access_denied')
  }

  if (!code || !stateStr) {
    status = 400
    finish()
    return fail('missing_parameters')
  }

  try {
    // STEP 1: Exchange code for short-lived user access token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', process.env.META_APP_ID!)
    tokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!)
    tokenUrl.searchParams.set('redirect_uri', `${REDIRECT_BASE}/api/auth/meta/callback`)
    tokenUrl.searchParams.set('code', code)

    const tokenRes = await providerFetch(tokenUrl.toString())
    const tokenData = await readJson(tokenRes)
    if (!tokenRes.ok || tokenData.error || !tokenData.access_token) throw new OAuthFlowError('provider_error')

    const shortLivedToken = tokenData.access_token

    // STEP 2: Exchange for long-lived token (60 days). Falls back to the short-lived token if
    // this call fails; it is still bounded by providerFetch's timeout.
    const longLivedUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longLivedUrl.searchParams.set('client_id', process.env.META_APP_ID!)
    longLivedUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!)
    longLivedUrl.searchParams.set('fb_exchange_token', shortLivedToken)

    let userToken = shortLivedToken
    try {
      const longLivedRes = await providerFetch(longLivedUrl.toString())
      const longLivedData = await readJson(longLivedRes)
      userToken = longLivedData.access_token ?? shortLivedToken
    } catch (err) {
      logger.warn(safeErrorInfo(err), 'meta_oauth.long_lived_exchange.failed')
    }
    timer.mark('token_exchange')

    // Pages — first page only (no picker).
    const pagesRes = await providerFetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,instagram_business_account,whatsapp_business_account&access_token=${encodeURIComponent(userToken)}`
    )
    const pagesData = await readJson(pagesRes)
    if (!pagesRes.ok || pagesData.error) throw new OAuthFlowError('provider_error')
    const page = pagesData.data?.[0]
    timer.mark('pages_fetch')

    if (!page) throw new OAuthFlowError('no_page')

    logger.info({ pageId: page.id, pageName: page.name }, 'meta_oauth.page.found')

    // Subscribe the Page to our webhook BEFORE recording it as 'connected'. A Page that fails
    // this call cannot receive any Messenger/Instagram events, so it must not read as a healthy
    // connection to the rest of the app (see meta/connections/route.ts, which treats
    // status === 'connected' as "integration is live").
    const webhookSubscription = await subscribePageToMetaWebhook(page.id, page.access_token)
    if (!webhookSubscription.success) {
      logger.error({ pageId: page.id, err: webhookSubscription.error }, 'meta_oauth.facebook.webhook_subscription.failed')
    }
    timer.mark('webhook_subscribe')

    const { error: saveError } = await supabase.from('platform_connections').upsert({
      workspace_id: workspaceId,
      platform: 'facebook',
      credentials: {
        user_access_token_encrypted: encrypt(userToken),
        page_access_token_encrypted: encrypt(page.access_token),
        page_id: page.id,
        page_name: page.name,
        health_status: webhookSubscription.success ? 'connected' : 'webhook_subscription_failed',
        ...(webhookSubscription.success ? {} : { webhook_subscription_error: webhookSubscription.error }),
      },
      status: webhookSubscription.success ? 'connected' : 'error',
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id,platform' })
    timer.mark('facebook_save')
    if (saveError) throw new OAuthFlowError('save_failed')

    // Instagram + WhatsApp discovery is a handful-to-dozens of sequential Graph calls — done in
    // the background so the user is redirected right away. The event carries ids only, never
    // tokens (the job re-reads them, encrypted, from the saved Facebook row). A failed send
    // must not fail the connect: Facebook is already saved.
    let discoveryFailed = false
    try {
      await inngest.send({
        name: 'meta/discover',
        data: {
          workspaceId,
          pageId: page.id,
          igId: page.instagram_business_account?.id ?? null,
          wabaId: page.whatsapp_business_account?.id ?? null,
          wabaName: page.whatsapp_business_account?.name ?? null,
        },
      })
    } catch (err) {
      discoveryFailed = true
      logger.error({ ...safeErrorInfo(err), requestId, workspaceId }, 'meta_oauth.discovery_enqueue.failed')
      // Persist the miss so the Instagram/WhatsApp cards can say so (reconnecting retries it).
      // Merge into the credentials we just wrote — a flag only, no secrets.
      try {
        const { data: row } = await supabase.from('platform_connections').select('credentials')
          .eq('workspace_id', workspaceId).eq('platform', 'facebook').maybeSingle()
        await supabase.from('platform_connections')
          .update({ credentials: { ...(row?.credentials as Record<string, unknown>), discovery_status: 'enqueue_failed' } })
          .eq('workspace_id', workspaceId).eq('platform', 'facebook')
      } catch (flagErr) {
        logger.warn({ ...safeErrorInfo(flagErr), requestId }, 'meta_oauth.discovery_flag.failed')
      }
    }
    timer.mark('discovery_enqueue')

    if (!webhookSubscription.success) throw new OAuthFlowError('webhook_failed')

    finish()
    if (returnTo === 'social') {
      return socialConnectionsRedirect(platform, { success: true, ...(discoveryFailed ? { warning: 'discovery_failed' as const } : {}) }, '/social/connections')
    }
    const redirectParams = new URLSearchParams({ meta_oauth: '1', platform, success: 'true' })
    if (discoveryFailed) redirectParams.set('warning', 'discovery_failed')
    return NextResponse.redirect(`${REDIRECT_BASE}${INTEGRATIONS_REDIRECT_PATH}&${redirectParams.toString()}`)
  } catch (err) {
    status = 500
    failure = err
    logger.error(safeErrorInfo(err), 'meta_oauth.callback.failed')
    finish()
    return fail(failureCodeOf(err))
  }
}
