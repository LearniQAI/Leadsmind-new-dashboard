import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { encrypt } from '@/lib/encryption'
import { META_CONFIG } from '@/lib/meta/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const stateStr = searchParams.get('state') || ''
  const [workspaceId, platform] = stateStr.split(':')

  const redirectBase = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  const integrationsUrl = `${redirectBase}/settings/integrations`

  if (!code || !workspaceId || !platform) {
    return NextResponse.redirect(`${integrationsUrl}?error=missing_parameters`)
  }

  try {
    // 1. Exchange authorization code for short-lived access token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${META_CONFIG.appId}&redirect_uri=${redirectBase}/api/auth/meta/callback&client_secret=${META_CONFIG.appSecret}&code=${code}`
    const tokenResponse = await fetch(tokenUrl)
    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error?.message || 'Failed to exchange Meta oauth code')
    }

    const { access_token: shortLivedToken } = tokenData

    // 2. Exchange short-lived token for a long-lived user access token
    const longLivedUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_CONFIG.appId}&client_secret=${META_CONFIG.appSecret}&fb_exchange_token=${shortLivedToken}`
    const longLivedResponse = await fetch(longLivedUrl)
    const longLivedData = await longLivedResponse.json()

    if (!longLivedResponse.ok) {
      throw new Error(longLivedData.error?.message || 'Failed to retrieve long-lived user token')
    }

    const { access_token: longLivedToken } = longLivedData

    // 3. Asset discovery based on platform
    if (platform === 'facebook' || platform === 'instagram') {
      // Get Pages list
      const pagesRes = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${longLivedToken}`
      )
      const pagesData = await pagesRes.json()
      if (!pagesRes.ok) {
        throw new Error(pagesData.error?.message || 'Failed to fetch Facebook Pages')
      }
      
      const page = pagesData.data?.[0]
      if (!page) {
        throw new Error('No Facebook Page found on this account')
      }

      const pageToken = page.access_token
      const pageId = page.id
      const pageName = page.name

      if (platform === 'facebook') {
        const { error: fbErr } = await supabase.from('platform_connections').upsert({
          workspace_id: workspaceId,
          platform: 'facebook',
          status: 'connected',
          credentials: {
            page_id: pageId,
            page_name: pageName,
            page_access_token_encrypted: encrypt(pageToken),
            user_access_token_encrypted: encrypt(longLivedToken),
            token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            health_status: 'connected'
          },
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'workspace_id,platform' })

        if (fbErr) throw fbErr
      }

      if (platform === 'instagram') {
        // Get Instagram Business Account linked to the Facebook Page
        const igRes = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
        )
        const igData = await igRes.json()
        if (!igRes.ok) {
          throw new Error(igData.error?.message || 'Failed to query Instagram details')
        }

        const igId = igData.instagram_business_account?.id
        if (!igId) {
          throw new Error('No Instagram Business Account linked to this Facebook Page')
        }

        // Get Instagram username/handle
        const igProfileRes = await fetch(
          `https://graph.facebook.com/v18.0/${igId}?fields=username&access_token=${pageToken}`
        )
        const igProfile = await igProfileRes.json()
        if (!igProfileRes.ok) {
          throw new Error(igProfile.error?.message || 'Failed to fetch Instagram profile username')
        }

        const { error: igErr } = await supabase.from('platform_connections').upsert({
          workspace_id: workspaceId,
          platform: 'instagram',
          status: 'connected',
          credentials: {
            instagram_business_account_id: igId,
            instagram_username: igProfile.username || 'IG Account',
            page_id: pageId,
            page_access_token_encrypted: encrypt(pageToken),
            token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            health_status: 'connected'
          },
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'workspace_id,platform' })

        if (igErr) throw igErr
      }
    } else if (platform === 'whatsapp') {
      // Get WhatsApp Business Accounts
      const wabaRes = await fetch(
        `https://graph.facebook.com/v18.0/me/businesses?access_token=${longLivedToken}`
      )
      const wabaData = await wabaRes.json()
      if (!wabaRes.ok) {
        throw new Error(wabaData.error?.message || 'Failed to fetch Business accounts')
      }

      const businessId = wabaData.data?.[0]?.id
      if (!businessId) {
        throw new Error('No Meta Business found on this account')
      }

      const phoneRes = await fetch(
        `https://graph.facebook.com/v18.0/${businessId}/owned_whatsapp_business_accounts?access_token=${longLivedToken}`
      )
      const phoneData = await phoneRes.json()
      if (!phoneRes.ok) {
        throw new Error(phoneData.error?.message || 'Failed to fetch WhatsApp accounts')
      }

      const waba = phoneData.data?.[0]
      if (!waba) {
        throw new Error('No WhatsApp Business Account found linked to the Meta Business')
      }

      const numbersRes = await fetch(
        `https://graph.facebook.com/v18.0/${waba.id}/phone_numbers?access_token=${longLivedToken}`
      )
      const numbersData = await numbersRes.json()
      if (!numbersRes.ok) {
        throw new Error(numbersData.error?.message || 'Failed to fetch WhatsApp phone numbers')
      }

      const phone = numbersData.data?.[0]
      if (!phone) {
        throw new Error('No phone numbers found inside this WhatsApp Business Account')
      }

      const { error: waErr } = await supabase.from('platform_connections').upsert({
        workspace_id: workspaceId,
        platform: 'whatsapp',
        status: 'connected',
        credentials: {
          phone_number_id: phone.id,
          whatsapp_business_account_id: waba.id,
          whatsapp_business_name: waba.name || 'WhatsApp Business Line',
          whatsapp_phone_number: phone.display_phone_number || 'WhatsApp Number',
          system_user_access_token_encrypted: encrypt(longLivedToken),
          token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          health_status: 'connected'
        },
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'workspace_id,platform' })

      if (waErr) throw waErr
    } else {
      throw new Error(`Unsupported platform: ${platform}`)
    }

    return NextResponse.redirect(`${integrationsUrl}?success=${platform}`)
  } catch (error: any) {
    console.error('[Meta OAuth Callback] Error:', error.message)
    return NextResponse.redirect(`${integrationsUrl}?error=${encodeURIComponent(error.message || 'unknown_error')}`)
  }
}
