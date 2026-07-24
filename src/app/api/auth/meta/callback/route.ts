import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/encryption'
import { consumeOAuthStateNonce } from '@/lib/oauth/stateNonce'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic';

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
    // state is a random opaque nonce minted at flow-initiation time, bound server-side to
    // the real authenticated user + their real workspace (+ which sub-platform was
    // requested, in `extra`) — never trust the raw state value as workspace_id/platform.
    const { workspaceId: resolvedWorkspaceId, extra } = await consumeOAuthStateNonce(stateStr, 'meta')
    workspaceId = resolvedWorkspaceId
    platform = (extra.platform ?? 'facebook') as 'facebook' | 'instagram' | 'whatsapp'
  } catch (nonceErr: any) {
    logger.error({ err: nonceErr }, 'meta_oauth.state_nonce.invalid')
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

    logger.info({ pageId: page?.id, pageName: page?.name }, 'meta_oauth.page.found')
    logger.info({ igAccount: page?.instagram_business_account }, 'meta_oauth.instagram_business_account.from_page')
    logger.info({ wabaAccount: page?.whatsapp_business_account }, 'meta_oauth.whatsapp_business_account.from_page')

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

    logger.info({}, 'meta_oauth.facebook.saved')

    // STEP 3 - Try to save Instagram (non-fatal if fails):
    logger.info({ hasUserToken: !!userToken }, 'meta_oauth.instagram_whatsapp_discovery.attempting')
    const igIdDirect = page?.instagram_business_account?.id
    logger.info({ igIdDirect }, 'meta_oauth.instagram_discovery.starting')
    let igId = igIdDirect
    let igUsername = null

    logger.info({ igId }, 'meta_oauth.instagram.attempt_1')

    if (!igId) {
      try {
        const igRes = await fetch(
          `https://graph.facebook.com/v18.0/${page.id}?fields=id,name,instagram_business_account&access_token=${page.access_token}`
        )
        const igData = await igRes.json()
        igId = igData?.instagram_business_account?.id
      } catch (err: any) { logger.error({ err: err.message }, 'meta_oauth.discovery.failed') }
      logger.info({ igId }, 'meta_oauth.instagram.attempt_2')
    }

    if (!igId) {
      try {
        const bizRes = await fetch(
          `https://graph.facebook.com/v18.0/me/businesses?access_token=${userToken}`
        )
        const bizData = await bizRes.json()
        for (const biz of bizData.data || []) {
          const igRes = await fetch(
            `https://graph.facebook.com/v18.0/${biz.id}/instagram_accounts?fields=id,username&access_token=${userToken}`
          )
          const igData = await igRes.json()
          logger.info({ bizId: biz.id, igData }, 'meta_oauth.instagram_accounts.for_business')
          if (igData.data?.[0]) {
            igId = igData.data[0].id
            igUsername = igData.data[0].username
            break
          }
        }
      } catch (err: any) {
        logger.error({ err: err.message }, 'meta_oauth.instagram.attempt_3_failed')
      }
    }
    logger.info({ igId }, 'meta_oauth.instagram.attempt_3')

    if (!igId) {
      try {
        // Attempt 4: fetch page with pages_read_engagement scope using userToken
        const pageDetailRes = await fetch(
          `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account{id,username}&access_token=${userToken}`
        )
        const pageDetail = await pageDetailRes.json()
        logger.info({ pageDetail }, 'meta_oauth.instagram.page_detail_user_token')
        igId = pageDetail?.instagram_business_account?.id
        igUsername = pageDetail?.instagram_business_account?.username
      } catch (err: any) {
        logger.error({ err: err.message }, 'meta_oauth.instagram.attempt_4_failed')
      }
    }

    if (!igId) {
      try {
        // Attempt 5: fetch page with pages_read_engagement scope using page.access_token as fallback
        const pageDetailRes = await fetch(
          `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account{id,username}&access_token=${page.access_token}`
        )
        const pageDetail = await pageDetailRes.json()
        logger.info({ pageDetail }, 'meta_oauth.instagram.page_detail_page_token')
        igId = pageDetail?.instagram_business_account?.id
        igUsername = pageDetail?.instagram_business_account?.username
      } catch (err: any) {
        logger.error({ err: err.message }, 'meta_oauth.instagram.attempt_5_failed')
      }
    }
    logger.info({ igId }, 'meta_oauth.instagram.attempt_4_5')

    if (igId) {
      if (!igUsername) {
        try {
          const igProfileRes = await fetch(
            `https://graph.facebook.com/v18.0/${igId}?fields=username,name&access_token=${page.access_token}`
          )
          const igProfile = await igProfileRes.json()
          igUsername = igProfile.username ?? null
        } catch (err: any) { logger.error({ err: err.message }, 'meta_oauth.instagram.username_discovery_failed') }
      }

      logger.info({ igId, igUsername }, 'meta_oauth.instagram.saving')
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
      logger.info({}, 'meta_oauth.instagram.saved')
    }

    // STEP 4 - Try to save WhatsApp (non-fatal if fails):
    logger.info({}, 'meta_oauth.whatsapp_discovery.starting')
    let wabaId = page?.whatsapp_business_account?.id
    let wabaName = page?.whatsapp_business_account?.name
    logger.info({ wabaId }, 'meta_oauth.whatsapp.from_page')

    if (!wabaId) {
      try {
        // Attempt: fetch WhatsApp directly from page using userToken
        const waPageRes = await fetch(
          `https://graph.facebook.com/v18.0/${page.id}?fields=whatsapp_business_account{id,name,phone_numbers{id,display_phone_number}}&access_token=${userToken}`
        )
        const waPageData = await waPageRes.json()
        logger.info({ waPageData }, 'meta_oauth.whatsapp.page_direct_user_token')
        wabaId = waPageData?.whatsapp_business_account?.id
        wabaName = waPageData?.whatsapp_business_account?.name
      } catch (err: any) {
        logger.error({ err: err.message }, 'meta_oauth.whatsapp.page_direct_user_token_failed')
      }
    }

    if (!wabaId) {
      try {
        // Attempt: fetch WhatsApp directly from page using page.access_token as fallback
        const waPageRes = await fetch(
          `https://graph.facebook.com/v18.0/${page.id}?fields=whatsapp_business_account{id,name,phone_numbers{id,display_phone_number}}&access_token=${page.access_token}`
        )
        const waPageData = await waPageRes.json()
        logger.info({ waPageData }, 'meta_oauth.whatsapp.page_direct_page_token')
        wabaId = waPageData?.whatsapp_business_account?.id
        wabaName = waPageData?.whatsapp_business_account?.name
      } catch (err: any) {
        logger.error({ err: err.message }, 'meta_oauth.whatsapp.page_direct_page_token_failed')
      }
    }
    logger.info({ wabaId }, 'meta_oauth.whatsapp.after_page_direct')

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
      } catch (err: any) { logger.error({ err: err.message }, 'meta_oauth.whatsapp.business_fallback_1_failed') }
      logger.info({ wabaId }, 'meta_oauth.whatsapp.after_business_fallback_1')
    }

    if (!wabaId) {
      try {
        const bizRes = await fetch(
          `https://graph.facebook.com/v18.0/me/businesses?access_token=${userToken}`
        )
        const bizData = await bizRes.json()
        for (const biz of bizData.data || []) {
          const wabaRes = await fetch(
            `https://graph.facebook.com/v18.0/${biz.id}/owned_whatsapp_business_accounts?access_token=${userToken}`
          )
          const wabaData = await wabaRes.json()
          logger.info({ bizId: biz.id, wabaData }, 'meta_oauth.whatsapp.waba_for_business')
          if (wabaData.data?.[0]) {
            wabaId = wabaData.data[0].id
            wabaName = wabaData.data[0].name
            break
          }
        }
      } catch (err: any) {
        logger.error({ err: err.message }, 'meta_oauth.whatsapp.business_fallback_2_failed')
      }
    }
    logger.info({ wabaId }, 'meta_oauth.whatsapp.after_business_fallback_2')

    if (wabaId) {
      try {
        const phoneRes = await fetch(
          `https://graph.facebook.com/v18.0/${wabaId}/phone_numbers?access_token=${userToken}`
        )
        const phoneData = await phoneRes.json()
        const phone = phoneData.data?.[0]

        if (phone) {
          logger.info({ wabaId, phoneId: phone?.id }, 'meta_oauth.whatsapp.saving')
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
          logger.info({}, 'meta_oauth.whatsapp.saved')
        }
      } catch (err: any) { logger.error({ err: err.message }, 'meta_oauth.whatsapp.phone_discovery_failed') }
    }

    // STEP 5 - Redirect to success:
    const redirectParams = new URLSearchParams({
      meta_oauth: '1',
      platform,
      success: 'true',
    })
    if (!igId) redirectParams.set('needs_instagram', 'true')
    if (!wabaId) redirectParams.set('needs_whatsapp', 'true')

    return NextResponse.redirect(
      `${REDIRECT_BASE}/settings/integrations?${redirectParams.toString()}`
    )

  } catch (err: any) {
    logger.error({ err: err.message }, 'meta_oauth.callback.failed')
    return NextResponse.redirect(
      `${REDIRECT_BASE}/settings/integrations?meta_oauth=1&error=${encodeURIComponent(err.message)}`
    )
  }
}
