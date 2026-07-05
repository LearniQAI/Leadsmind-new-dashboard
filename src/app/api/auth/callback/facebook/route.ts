import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const workspaceId = searchParams.get('state');

  if (!code || !workspaceId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social?error=missing_parameters`);
  }

  try {
    // 1. Exchange code for access token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/facebook&client_secret=${process.env.META_APP_SECRET}&code=${code}`;
    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) throw new Error(tokenData.error?.message || 'Failed to exchange token');

    const { access_token, expires_in } = tokenData;

    // 2. Fetch user profile
    const profileResponse = await fetch(`https://graph.facebook.com/me?access_token=${access_token}&fields=id,name`);
    const profileData = await profileResponse.json();
    const { id: accountId, name: accountName } = profileData;

    // 3. Store in social_accounts table
    const { error } = await supabase.from('social_accounts').upsert({
      workspace_id: workspaceId,
      platform: 'facebook',
      account_name: accountName,
      account_id: accountId,
      access_token_encrypted: access_token,
      token_expires_at: expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null,
    }, { onConflict: 'workspace_id,platform,account_id' });

    if (error) throw error;

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social?success=facebook_connected`);
  } catch (error: any) {
    console.error('Facebook Auth Error:', error.message);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social?error=auth_failed`);
  }
}
