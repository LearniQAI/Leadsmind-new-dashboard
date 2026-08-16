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
export async function subscribePageToMetaWebhook(
  pageId: string,
  pageAccessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = new URL(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`)
    url.searchParams.set('subscribed_fields', 'messages,messaging_postbacks,message_deliveries,message_reads')
    url.searchParams.set('access_token', pageAccessToken)

    const res = await fetch(url.toString(), { method: 'POST' })
    const data = await res.json()

    if (!res.ok || data?.success !== true) {
      return {
        success: false,
        error: data?.error?.message ?? `subscribed_apps did not return success:true (response: ${JSON.stringify(data)})`,
      }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'subscribed_apps request threw' }
  }
}
