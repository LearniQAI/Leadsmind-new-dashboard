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
  const stateStr = searchParams.get('state') || '';
  const [workspaceId, targetPlatform] = stateStr.split(':');

  const redirectBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!code || !workspaceId) {
    return NextResponse.redirect(`${redirectBase}/conversations?error=missing_parameters`);
  }

  // QA / Mock Bypass Flow
  if (code === 'mock_code' || !process.env.META_APP_ID || process.env.META_APP_ID === 'placeholder') {
    console.log('[Meta Callback] Mock flow activated or missing credentials. Saving pending mock connection.');
    try {
      // 1. Facebook Connection in pending state
      await supabase.from('platform_connections').upsert({
        workspace_id: workspaceId,
        platform: 'facebook',
        credentials: {
          is_mock: true,
          user_access_token_encrypted: encrypt('mock_fb_user_token'),
          health_status: 'connected'
        },
        status: 'pending',
        last_sync_at: new Date().toISOString()
      }, { onConflict: 'workspace_id,platform' });

      const platformParam = targetPlatform ? `&platform=${targetPlatform}` : '';
      return NextResponse.redirect(`${redirectBase}/settings?tab=integrations&meta_oauth=1${platformParam}`);
    } catch (e: any) {
      console.error('[Meta Callback] Mock connection upsert error:', e.message);
      return NextResponse.redirect(`${redirectBase}/settings?tab=integrations&error=auth_failed`);
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

    // 3. Store temporary connection status 'pending'
    await supabase.from('platform_connections').upsert({
      workspace_id: workspaceId,
      platform: 'facebook',
      credentials: {
        user_access_token_encrypted: encrypt(longLivedToken),
        health_status: 'connected'
      },
      status: 'pending',
      last_sync_at: new Date().toISOString()
    }, { onConflict: 'workspace_id,platform' });

    const platformParam = targetPlatform ? `&platform=${targetPlatform}` : '';
    return NextResponse.redirect(`${redirectBase}/settings?tab=integrations&meta_oauth=1${platformParam}`);
  } catch (error: any) {
    console.error('[Meta Callback] OAuth Error:', error.message);
    return NextResponse.redirect(`${redirectBase}/settings?tab=integrations&error=auth_failed&message=${encodeURIComponent(error.message)}`);
  }
}
