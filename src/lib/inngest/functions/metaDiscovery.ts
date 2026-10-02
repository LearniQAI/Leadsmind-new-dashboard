import { createClient } from '@supabase/supabase-js'
import { inngest } from '@/lib/inngest'
import { logger } from '@/shared/logger'
import { encrypt, decrypt } from '@/lib/encryption'
import { providerFetch, readJson, safeErrorInfo } from '@/lib/oauth/socialOAuth'
import { subscribeWabaToMetaWebhook } from '@/lib/meta/subscribeWebhook'

// Instagram + WhatsApp discovery used to run inside the Meta OAuth callback as ~10-20 sequential
// Graph calls, so the user waited on all of them before being redirected. The callback now only
// stores the Facebook Page connection; this job finishes the rest in the background. It never
// receives tokens in the event payload — it re-reads them (encrypted) from the saved Facebook row.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const GRAPH = 'https://graph.facebook.com/v18.0'

export interface MetaDiscoveryEventData {
  workspaceId: string
  pageId: string
  // Ids the callback already saw on the /me/accounts response (not secrets).
  igId?: string | null
  wabaId?: string | null
  wabaName?: string | null
}

// One bounded Graph GET; any failure (timeout, HTTP error, bad JSON) is "nothing found", never a throw.
async function graphGet(path: string, token: string): Promise<any | null> {
  try {
    const sep = path.includes('?') ? '&' : '?'
    const res = await providerFetch(`${GRAPH}/${path}${sep}access_token=${encodeURIComponent(token)}`)
    const data = await readJson(res)
    return res.ok && !data?.error ? data : null
  } catch (err) {
    logger.warn(safeErrorInfo(err), 'meta_discovery.graph_get.failed')
    return null
  }
}

async function loadFacebookRow(workspaceId: string, pageId: string) {
  const { data } = await supabase
    .from('platform_connections')
    .select('status, credentials')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'facebook')
    .maybeSingle()
  const creds = data?.credentials as Record<string, any> | undefined
  // The user may have reconnected to a different Page or disconnected since the event was sent.
  if (!data || creds?.page_id !== pageId) return null
  return {
    status: data.status as string,
    health: (creds?.health_status as string) ?? 'connected',
    pageName: (creds?.page_name as string) ?? null,
    userToken: decrypt(creds!.user_access_token_encrypted),
    pageToken: decrypt(creds!.page_access_token_encrypted),
  }
}

async function discoverInstagram(d: MetaDiscoveryEventData): Promise<string | null> {
  const fb = await loadFacebookRow(d.workspaceId, d.pageId)
  if (!fb) return null

  let igId = d.igId ?? null
  let igUsername: string | null = null

  if (!igId) igId = (await graphGet(`${d.pageId}?fields=id,name,instagram_business_account`, fb.pageToken))?.instagram_business_account?.id ?? null

  if (!igId) {
    const biz = await graphGet('me/businesses', fb.userToken)
    for (const b of biz?.data ?? []) {
      const ig = await graphGet(`${b.id}/instagram_accounts?fields=id,username`, fb.userToken)
      if (ig?.data?.[0]) {
        igId = ig.data[0].id
        igUsername = ig.data[0].username ?? null
        break
      }
    }
  }

  if (!igId) {
    const detail = await graphGet(`${d.pageId}?fields=instagram_business_account{id,username}`, fb.userToken)
    igId = detail?.instagram_business_account?.id ?? null
    igUsername = detail?.instagram_business_account?.username ?? null
  }

  if (!igId) {
    const detail = await graphGet(`${d.pageId}?fields=instagram_business_account{id,username}`, fb.pageToken)
    igId = detail?.instagram_business_account?.id ?? null
    igUsername = detail?.instagram_business_account?.username ?? null
  }

  if (!igId) return null

  if (!igUsername) igUsername = (await graphGet(`${igId}?fields=username,name`, fb.pageToken))?.username ?? null

  // Instagram DMs ride on the same Page-level webhook subscription, so this row mirrors the
  // Facebook row's health (see the original note in the Meta callback).
  const { error } = await supabase.from('platform_connections').upsert({
    workspace_id: d.workspaceId,
    platform: 'instagram',
    credentials: {
      user_access_token_encrypted: encrypt(fb.userToken),
      page_access_token_encrypted: encrypt(fb.pageToken),
      page_id: d.pageId,
      page_name: fb.pageName,
      instagram_id: igId,
      instagram_username: igUsername,
      health_status: fb.health,
    },
    status: fb.status,
    last_sync_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'workspace_id,platform' })
  if (error) throw new Error('instagram upsert failed')
  return igId
}

async function discoverWhatsApp(d: MetaDiscoveryEventData): Promise<string | null> {
  const fb = await loadFacebookRow(d.workspaceId, d.pageId)
  if (!fb) return null

  let wabaId = d.wabaId ?? null
  let wabaName = d.wabaName ?? null
  const waFields = 'whatsapp_business_account{id,name,phone_numbers{id,display_phone_number}}'

  for (const token of [fb.userToken, fb.pageToken]) {
    if (wabaId) break
    const data = await graphGet(`${d.pageId}?fields=${waFields}`, token)
    wabaId = data?.whatsapp_business_account?.id ?? null
    wabaName = data?.whatsapp_business_account?.name ?? null
  }

  if (!wabaId) {
    const biz = await graphGet('me/businesses', fb.userToken)
    for (const b of biz?.data ?? []) {
      const waba = await graphGet(`${b.id}/owned_whatsapp_business_accounts`, fb.userToken)
      if (waba?.data?.[0]) {
        wabaId = waba.data[0].id
        wabaName = waba.data[0].name ?? null
        break
      }
    }
  }

  if (!wabaId) return null

  const phone = (await graphGet(`${wabaId}/phone_numbers`, fb.userToken))?.data?.[0]
  if (!phone) return null

  // Without this per-WABA subscription Meta delivers no WhatsApp events for this account.
  const sub = await subscribeWabaToMetaWebhook(wabaId, fb.userToken)
  if (!sub.success) logger.error({ wabaId }, 'meta_discovery.whatsapp.webhook_subscription_failed')

  const { error } = await supabase.from('platform_connections').upsert({
    workspace_id: d.workspaceId,
    platform: 'whatsapp',
    credentials: {
      access_token_encrypted: encrypt(fb.userToken),
      waba_id: wabaId,
      waba_name: wabaName ?? 'WhatsApp Business',
      phone_number_id: phone.id,
      phone_number: phone.display_phone_number,
      health_status: sub.success ? 'connected' : 'webhook_subscription_failed',
      ...(sub.success ? {} : { webhook_subscription_error: sub.error }),
    },
    status: sub.success ? 'connected' : 'error',
    last_sync_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'workspace_id,platform' })
  if (error) throw new Error('whatsapp upsert failed')
  return wabaId
}

export const metaDiscoveryFn = inngest.createFunction(
  {
    id: 'meta-discover-instagram-whatsapp',
    retries: 2,
    name: 'Discover Instagram and WhatsApp after Meta connect',
    triggers: { event: 'meta/discover' },
  },
  async ({ event, step }) => {
    const data = event.data as MetaDiscoveryEventData
    const instagramId = await step.run('discover-instagram', () => discoverInstagram(data))
    const whatsappId = await step.run('discover-whatsapp', () => discoverWhatsApp(data))
    return { instagram: !!instagramId, whatsapp: !!whatsappId }
  }
)
