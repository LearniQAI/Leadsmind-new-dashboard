import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/encryption'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const REDIRECT_BASE = process.env.NEXT_PUBLIC_APP_URL 
  ?? 'https://leadsmind-new-dashboard.vercel.app'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const stateStr = searchParams.get('state') ?? ''
  const errorParam = searchParams.get('error')

  // User denied access
  if (errorParam) {
    return NextResponse.redirect(
      `${REDIRECT_BASE}/settings/integrations?meta_oauth=1&error=access_denied`
    )
  }

  if (!code || !stateStr) {
    return NextResponse.redirect(
      `${REDIRECT_BASE}/settings/integrations?meta_oauth=1&error=missing_params`
    )
  }

  let workspaceId = ''
  let platform: 'facebook' | 'instagram' | 'whatsapp' = 'facebook'

  try {
    // Try JSON format first: {"platform":"facebook","workspaceId":"abc123"}
    const stateObj = JSON.parse(decodeURIComponent(stateStr))
    workspaceId = stateObj.workspaceId ?? ''
    platform = (stateObj.platform ?? 'facebook') as 'facebook' | 'instagram' | 'whatsapp'
  } catch {
    // Fallback: colon format "workspaceId:platform"
    const parts = stateStr.split(':')
    workspaceId = parts[0] ?? ''
    platform = (parts[1] ?? 'facebook') as 'facebook' | 'instagram' | 'whatsapp'
  }

  if (!workspaceId) {
    return NextResponse.redirect(
      `${REDIRECT_BASE}/settings/integrations?meta_oauth=1&error=invalid_state`
    )
  }

  try {
    // STEP 1: Exchange code for short-lived user access token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', process.env.META_APP_ID!)
    tokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!)
    tokenUrl.searchParams.set('redirect_uri', `${REDIRECT_BASE}/api/auth/meta/callback`)
    tokenUrl.searchParams.set('code', code)

    const tokenRes = await fetch(tokenUrl.toString())
    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || tokenData.error) {
      throw new Error(tokenData.error?.message ?? 'Failed to exchange code for token')
    }

    const shortLivedToken = tokenData.access_token

    // STEP 2: Exchange for long-lived token (60 days)
    const longLivedUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longLivedUrl.searchParams.set('client_id', process.env.META_APP_ID!)
    longLivedUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!)
    longLivedUrl.searchParams.set('fb_exchange_token', shortLivedToken)

    const longLivedRes = await fetch(longLivedUrl.toString())
    const longLivedData = await longLivedRes.json()
    const userToken = longLivedData.access_token ?? shortLivedToken

    // STEP 3: Discover assets based on platform
    let credentials: Record<string, any> = {}

    if (platform === 'facebook') {
      // Get Facebook Pages managed by this user
      const pagesRes = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${userToken}`
      )
      const pagesData = await pagesRes.json()
      const page = pagesData.data?.[0]

      if (!page) {
        throw new Error(
          'No Facebook Page found. Make sure your Facebook account manages at least one Page.'
        )
      }

      credentials = {
        user_access_token_encrypted: encrypt(userToken),
        page_access_token_encrypted: encrypt(page.access_token),
        page_id: page.id,
        page_name: page.name,
        health_status: 'connected',
      }
    }

    if (platform === 'instagram') {
      // Get Facebook Page first
      const pagesRes = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${userToken}`
      )
      const pagesData = await pagesRes.json()
      const page = pagesData.data?.[0]

      if (!page) {
        throw new Error(
          'No Facebook Page found. Instagram Business requires a linked Facebook Page.'
        )
      }

      // Get Instagram Business Account linked to the Page
      const igRes = await fetch(
        `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
      )
      const igData = await igRes.json()
      const igId = igData.instagram_business_account?.id

      if (!igId) {
        throw new Error(
          'No Instagram Business Account linked to this Facebook Page. Convert your Instagram to a Business account and link it to your Page.'
        )
      }

      // Get Instagram username
      const igProfileRes = await fetch(
        `https://graph.facebook.com/v18.0/${igId}?fields=username,name&access_token=${page.access_token}`
      )
      const igProfile = await igProfileRes.json()

      credentials = {
        user_access_token_encrypted: encrypt(userToken),
        page_access_token_encrypted: encrypt(page.access_token),
        page_id: page.id,
        page_name: page.name,
        instagram_id: igId,
        instagram_username: igProfile.username ?? null,
        health_status: 'connected',
      }
    }

    if (platform === 'whatsapp') {
      // Get Meta Business accounts
      const bizRes = await fetch(
        `https://graph.facebook.com/v18.0/me/businesses?access_token=${userToken}`
      )
      const bizData = await bizRes.json()
      const business = bizData.data?.[0]

      if (!business) {
        throw new Error(
          'No Meta Business found. A Meta Business account is required for WhatsApp.'
        )
      }

      // Get WhatsApp Business Accounts under the business
      const wabaRes = await fetch(
        `https://graph.facebook.com/v18.0/${business.id}/owned_whatsapp_business_accounts?access_token=${userToken}`
      )
      const wabaData = await wabaRes.json()
      const waba = wabaData.data?.[0]

      if (!waba) {
        throw new Error(
          'No WhatsApp Business Account found under your Meta Business.'
        )
      }

      // Get phone numbers under the WABA
      const phoneRes = await fetch(
        `https://graph.facebook.com/v18.0/${waba.id}/phone_numbers?access_token=${userToken}`
      )
      const phoneData = await phoneRes.json()
      const phone = phoneData.data?.[0]

      if (!phone) {
        throw new Error(
          'No WhatsApp phone number found. Add a phone number to your WhatsApp Business Account.'
        )
      }

      credentials = {
        access_token_encrypted: encrypt(userToken),
        waba_id: waba.id,
        waba_name: waba.name,
        phone_number_id: phone.id,
        phone_number: phone.display_phone_number,
        health_status: 'connected',
      }
    }

    // STEP 4: Save to platform_connections
    const { error: upsertError } = await supabase
      .from('platform_connections')
      .upsert(
        {
          workspace_id: workspaceId,
          platform,
          credentials,
          status: 'connected',
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'workspace_id,platform' }
      )

    if (upsertError) {
      throw new Error(`Database error: ${upsertError.message}`)
    }

    // STEP 5: Redirect to success
    return NextResponse.redirect(
      `${REDIRECT_BASE}/settings/integrations?meta_oauth=1&platform=${platform}&success=true`
    )

  } catch (err: any) {
    console.error('[Meta OAuth Callback Error]', err.message)
    return NextResponse.redirect(
      `${REDIRECT_BASE}/settings/integrations?meta_oauth=1&error=${encodeURIComponent(err.message)}`
    )
  }
}
