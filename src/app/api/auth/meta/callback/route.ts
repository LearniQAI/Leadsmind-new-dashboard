import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { encrypt } from '@/lib/encryption';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const workspaceId = searchParams.get('state');

  const redirectBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!code || !workspaceId) {
    return NextResponse.redirect(`${redirectBase}/conversations?error=missing_parameters`);
  }

  // QA / Mock Bypass Flow
  if (code === 'mock_code' || !process.env.META_APP_ID || process.env.META_APP_ID === 'placeholder') {
    console.log('[Meta Callback] Mock flow activated or missing credentials. Upserting mock connections.');
    try {
      const mockPageId = 'mock_page_123';
      const mockIgId = 'mock_ig_456';
      const mockWabaId = 'mock_waba_789';
      const mockPhoneId = 'mock_phone_012';

      // 1. Facebook Connection
      await supabase.from('platform_connections').upsert({
        workspace_id: workspaceId,
        platform: 'facebook',
        credentials: {
          page_id: mockPageId,
          page_name: 'LeadsMind Facebook Page',
          page_access_token_encrypted: encrypt('mock_fb_page_token'),
          user_access_token_encrypted: encrypt('mock_fb_user_token')
        },
        status: 'connected',
        last_sync_at: new Date().toISOString()
      }, { onConflict: 'workspace_id,platform' });

      // 2. Instagram Connection
      await supabase.from('platform_connections').upsert({
        workspace_id: workspaceId,
        platform: 'instagram',
        credentials: {
          instagram_business_account_id: mockIgId,
          page_id: mockPageId,
          page_access_token_encrypted: encrypt('mock_ig_page_token')
        },
        status: 'connected',
        last_sync_at: new Date().toISOString()
      }, { onConflict: 'workspace_id,platform' });

      // 3. WhatsApp Connection
      await supabase.from('platform_connections').upsert({
        workspace_id: workspaceId,
        platform: 'whatsapp',
        credentials: {
          phone_number_id: mockPhoneId,
          whatsapp_business_account_id: mockWabaId,
          system_user_access_token_encrypted: encrypt('mock_wa_system_token')
        },
        status: 'connected',
        last_sync_at: new Date().toISOString()
      }, { onConflict: 'workspace_id,platform' });

      return NextResponse.redirect(`${redirectBase}/conversations?success=meta_connected`);
    } catch (e: any) {
      console.error('[Meta Callback] Mock connection upsert error:', e.message);
      return NextResponse.redirect(`${redirectBase}/conversations?error=auth_failed`);
    }
  }

  try {
    // 1. Exchange short-lived authorization code for user access token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${redirectBase}/api/auth/meta/callback&client_secret=${process.env.META_APP_SECRET}&code=${code}`;
    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error?.message || 'Failed to exchange Meta oauth code');
    }

    const { access_token: shortLivedToken } = tokenData;

    // 2. Exchange for long-lived user access token
    const longLivedUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${shortLivedToken}`;
    const longLivedResponse = await fetch(longLivedUrl);
    const longLivedData = await longLivedResponse.json();

    if (!longLivedResponse.ok) {
      throw new Error(longLivedData.error?.message || 'Failed to retrieve long-lived user token');
    }

    const { access_token: longLivedToken } = longLivedData;

    // 3. Retrieve Facebook Pages linked to the account
    const pagesResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${longLivedToken}`);
    const pagesData = await pagesResponse.json();

    if (!pagesResponse.ok) {
      throw new Error(pagesData.error?.message || 'Failed to retrieve Facebook pages list');
    }

    const pages = pagesData.data || [];
    if (pages.length === 0) {
      throw new Error('No Facebook pages associated with the connecting Meta user account');
    }

    // Capture the primary connected Page details (for demonstration & default routing)
    const primaryPage = pages[0];
    const pageId = primaryPage.id;
    const pageName = primaryPage.name;
    const pageAccessToken = primaryPage.access_token;

    // 4. Retrieve linked Instagram Business Account
    let instagramBusinessAccountId = null;
    const igResponse = await fetch(`https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`);
    if (igResponse.ok) {
      const igData = await igResponse.json();
      instagramBusinessAccountId = igData.instagram_business_account?.id || null;
    }

    // 5. Retrieve linked WhatsApp Business Accounts
    let whatsappBusinessAccountId = null;
    let phoneNumberId = null;
    const wabaResponse = await fetch(`https://graph.facebook.com/v18.0/me/whatsapp_business_accounts?access_token=${longLivedToken}`);
    if (wabaResponse.ok) {
      const wabaData = await wabaResponse.json();
      const wabaList = wabaData.data || [];
      if (wabaList.length > 0) {
        whatsappBusinessAccountId = wabaList[0].id;
        // Fetch phone numbers of that business account
        const phoneResponse = await fetch(`https://graph.facebook.com/v18.0/${whatsappBusinessAccountId}/phone_numbers?access_token=${longLivedToken}`);
        if (phoneResponse.ok) {
          const phoneData = await phoneResponse.json();
          phoneNumberId = phoneData.data?.[0]?.id || null;
        }
      }
    }

    // 6. Store Connections in platform_connections
    // Store Facebook connection
    await supabase.from('platform_connections').upsert({
      workspace_id: workspaceId,
      platform: 'facebook',
      credentials: {
        page_id: pageId,
        page_name: pageName,
        page_access_token_encrypted: encrypt(pageAccessToken),
        user_access_token_encrypted: encrypt(longLivedToken)
      },
      status: 'connected',
      last_sync_at: new Date().toISOString()
    }, { onConflict: 'workspace_id,platform' });

    // Store Instagram connection (if present)
    if (instagramBusinessAccountId) {
      await supabase.from('platform_connections').upsert({
        workspace_id: workspaceId,
        platform: 'instagram',
        credentials: {
          instagram_business_account_id: instagramBusinessAccountId,
          page_id: pageId,
          page_access_token_encrypted: encrypt(pageAccessToken)
        },
        status: 'connected',
        last_sync_at: new Date().toISOString()
      }, { onConflict: 'workspace_id,platform' });
    }

    // Store WhatsApp connection (if present)
    if (phoneNumberId && whatsappBusinessAccountId) {
      await supabase.from('platform_connections').upsert({
        workspace_id: workspaceId,
        platform: 'whatsapp',
        credentials: {
          phone_number_id: phoneNumberId,
          whatsapp_business_account_id: whatsappBusinessAccountId,
          system_user_access_token_encrypted: encrypt(longLivedToken)
        },
        status: 'connected',
        last_sync_at: new Date().toISOString()
      }, { onConflict: 'workspace_id,platform' });
    }

    return NextResponse.redirect(`${redirectBase}/conversations?success=meta_connected`);
  } catch (error: any) {
    console.error('[Meta Callback] OAuth Error:', error.message);
    return NextResponse.redirect(`${redirectBase}/conversations?error=auth_failed&message=${encodeURIComponent(error.message)}`);
  }
}
