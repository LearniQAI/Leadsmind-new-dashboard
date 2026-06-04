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

    // STEP 1 - Always fetch pages with full fields:
    const pagesRes = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,instagram_business_account,whatsapp_business_account&access_token=${userToken}`
    )
    const pagesData = await pagesRes.json()
    const page = pagesData.data?.[0]

    if (!page) throw new Error('No Facebook Page found.')

    // STEP 2 - Always save Facebook:
    await supabase.from('platform_connections').upsert({
      workspace_id: workspaceId,
      platform: 'facebook',
      credentials: {
        user_access_token_encrypted: encrypt(userToken),
        page_access_token_encrypted: encrypt(page.access_token),
        page_id: page.id,
        page_name: page.name,
        health_status: 'connected',
      },
      status: 'connected',
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id,platform' })

    // STEP 3 - Try to save Instagram (non-fatal if fails):
    const igIdDirect = page?.instagram_business_account?.id
    let igId = igIdDirect

    if (!igId) {
      try {
        const igRes = await fetch(
          `https://graph.facebook.com/v18.0/${page.id}?fields=id,name,instagram_business_account&access_token=${page.access_token}`
        )
        const igData = await igRes.json()
        igId = igData?.instagram_business_account?.id
      } catch {}
    }

    if (igId) {
      let igUsername = null
      try {
        const igProfileRes = await fetch(
          `https://graph.facebook.com/v18.0/${igId}?fields=username,name&access_token=${page.access_token}`
        )
        const igProfile = await igProfileRes.json()
        igUsername = igProfile.username ?? null
      } catch {}

      await supabase.from('platform_connections').upsert({
        workspace_id: workspaceId,
        platform: 'instagram',
        credentials: {
          user_access_token_encrypted: encrypt(userToken),
          page_access_token_encrypted: encrypt(page.access_token),
          page_id: page.id,
          page_name: page.name,
          instagram_id: igId,
          instagram_username: igUsername,
          health_status: 'connected',
        },
        status: 'connected',
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,platform' })
    }

    // STEP 4 - Try to save WhatsApp (non-fatal if fails):
    let wabaId = page?.whatsapp_business_account?.id
    let wabaName = page?.whatsapp_business_account?.name

    if (!wabaId) {
      try {
        const bizRes = await fetch(
          `https://graph.facebook.com/v18.0/me/businesses?access_token=${userToken}`
        )
        const bizData = await bizRes.json()
        const business = bizData.data?.[0]
        if (business) {
          const wabaRes = await fetch(
            `https://graph.facebook.com/v18.0/${business.id}/owned_whatsapp_business_accounts?access_token=${userToken}`
          )
          const wabaData = await wabaRes.json()
          wabaId = wabaData.data?.[0]?.id
          wabaName = wabaData.data?.[0]?.name
        }
      } catch {}
    }

    if (wabaId) {
      try {
        const phoneRes = await fetch(
          `https://graph.facebook.com/v18.0/${wabaId}/phone_numbers?access_token=${userToken}`
        )
        const phoneData = await phoneRes.json()
        const phone = phoneData.data?.[0]

        if (phone) {
          await supabase.from('platform_connections').upsert({
            workspace_id: workspaceId,
            platform: 'whatsapp',
            credentials: {
              access_token_encrypted: encrypt(userToken),
              waba_id: wabaId,
              waba_name: wabaName ?? 'WhatsApp Business',
              phone_number_id: phone.id,
              phone_number: phone.display_phone_number,
              health_status: 'connected',
            },
            status: 'connected',
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'workspace_id,platform' })
        }
      } catch {}
    }

    // STEP 5 - Redirect to success:
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
