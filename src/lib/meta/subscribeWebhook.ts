// Subscribes a specific Facebook Page to our app's webhook so Messenger events actually get
// delivered. App-level field subscription in the Meta App Dashboard (Webhooks product) only
// tells Meta which fields your app CAN receive — it does not link any particular Page to your
// app. Without this per-Page call, Meta never sends events for that Page to our webhook URL at
// all, even though webhook verification (the GET challenge) succeeds and the dashboard looks
// fully configured. Instagram DMs for a Page-linked Instagram professional account ride on this
// same Page-level subscription (there is no separate per-IG-account subscribed_apps endpoint
// for accounts connected via Facebook Login for Business, which is the flow used here) — see
// https://developers.facebook.com/docs/messenger-platform/instagram/features/webhook/, which
// requires `instagram_manage_messages` in the Page token plus the Page's own subscription.
//
// Called from both the OAuth connect callback (new connections) and the one-time backfill route
// (connections created before this file existed) — kept here as the single source of truth so
// the two call sites can't drift on subscribed_fields or the success-check.
//
// A POST here can return {"success":true} without Meta actually attaching the subscription —
// confirmed live: a Page's connection recorded health_status:'connected' off this response, but
// GET /{page-id}/subscribed_apps came back {"data":[]}. So success:true from the POST alone is
// not proof; we re-GET the same endpoint afterward and only report success if our app id is
// actually listed.
//
// Leading suspect for why the original call didn't attach: this endpoint was pinned to v18.0
// (released May 2023). Graph API versions are only guaranteed for ~2 years, so by the time of
// the incident v18.0 was already past its normal support window. A manual re-POST against v25.0
// with an otherwise-equivalent Page token worked immediately and the follow-up GET confirmed it
// — so the version pin, not token scope/type/timing, is the prime suspect. Matched to v25.0
// exactly (the version confirmed working live) rather than guessing at some other "currently
// supported" version — whatever version is actually verified-good is the only one to trust here.
// Whoever revisits this: re-check that v25.0 is still within Meta's ~2-year support window and
// bump again if not, using the same live POST+GET verification to confirm before/after.
import { logger } from '@/shared/logger'

const GRAPH_API_VERSION = 'v25.0'

export async function subscribePageToMetaWebhook(
  pageId: string,
  pageAccessToken: string
): Promise<{ success: boolean; error?: string }> {
  const appId = process.env.META_APP_ID
  try {
    const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/subscribed_apps`)
    url.searchParams.set('subscribed_fields', 'messages,messaging_postbacks,message_deliveries,message_reads')
    url.searchParams.set('access_token', pageAccessToken)

    const res = await fetch(url.toString(), { method: 'POST' })
    const data = await res.json()

    logger.info({ pageId, status: res.status, rawResponse: data }, 'meta.subscribe_webhook.post_response')

    if (!res.ok || data?.success !== true) {
      return {
        success: false,
        error: data?.error?.message ?? `subscribed_apps did not return success:true (response: ${JSON.stringify(data)})`,
      }
    }

    // POST returned success:true — verify Meta actually attached it before trusting that.
    if (!appId) {
      logger.error({ pageId }, 'meta.subscribe_webhook.verify_skipped_missing_app_id')
      return {
        success: false,
        error: 'subscribed_apps POST returned success but verification was skipped: META_APP_ID env var is not set',
      }
    }

    const verifyUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/subscribed_apps`)
    verifyUrl.searchParams.set('access_token', pageAccessToken)

    const verifyRes = await fetch(verifyUrl.toString())
    const verifyData = await verifyRes.json()

    logger.info({ pageId, status: verifyRes.status, rawResponse: verifyData }, 'meta.subscribe_webhook.verify_get_response')

    const isListed = verifyRes.ok && Array.isArray(verifyData?.data) &&
      verifyData.data.some((entry: any) => String(entry?.id) === String(appId))

    if (!isListed) {
      return {
        success: false,
        error: `subscribed_apps POST returned success but verification GET did not list this app (response: ${JSON.stringify(verifyData)})`,
      }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'subscribed_apps request threw' }
  }
}

// WhatsApp needs its OWN subscription, separate from the Page one above: the app must be subscribed
// to each WhatsApp Business Account (POST /{waba-id}/subscribed_apps) or Meta sends no WhatsApp
// events for it at all — no inbound messages (so no STOP and no 24h-window clock) and no
// sent/delivered/read/failed statuses. Confirmed live 2026-09-24: every connected WABA returned
// {"data":[]} and not one WhatsApp webhook had ever arrived.
// Which fields are delivered comes from the app-level Webhooks config (whatsapp_business_account
// object, "messages" field), so this call takes no subscribed_fields.
// Same POST-then-verify rule as the Page subscription. The WABA listing nests the app id under
// whatsapp_business_api_data. The id checked is the token's own app (GET /app): that is the app the
// POST subscribes, and it does not depend on META_APP_ID being set in this environment.
export async function subscribeWabaToMetaWebhook(
  wabaId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const appRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/app?fields=id&access_token=${encodeURIComponent(accessToken)}`)
    const appData = await appRes.json()
    const appId = appRes.ok ? String(appData?.id ?? '') : ''
    if (!appId) {
      return { success: false, error: appData?.error?.message ?? 'Could not resolve the app this token belongs to' }
    }

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/subscribed_apps?access_token=${encodeURIComponent(accessToken)}`
    const res = await fetch(url, { method: 'POST' })
    const data = await res.json()
    logger.info({ wabaId, status: res.status, rawResponse: data }, 'meta.subscribe_waba_webhook.post_response')

    if (!res.ok || data?.success !== true) {
      return {
        success: false,
        error: data?.error?.message ?? `subscribed_apps did not return success:true (response: ${JSON.stringify(data)})`,
      }
    }

    const verifyRes = await fetch(url)
    const verifyData = await verifyRes.json()
    logger.info({ wabaId, status: verifyRes.status, rawResponse: verifyData }, 'meta.subscribe_waba_webhook.verify_get_response')

    const isListed = verifyRes.ok && Array.isArray(verifyData?.data) &&
      verifyData.data.some((entry: any) => String(entry?.whatsapp_business_api_data?.id ?? entry?.id) === appId)

    if (!isListed) {
      return {
        success: false,
        error: `subscribed_apps POST returned success but verification GET did not list this app (response: ${JSON.stringify(verifyData)})`,
      }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'subscribed_apps request threw' }
  }
}
