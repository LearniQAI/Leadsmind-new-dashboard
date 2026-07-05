import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { encrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const workspaceId = searchParams.get('state');

  // Let's determine redirect base (e.g. settings page landing directly on SEO tab)
  const redirectBase = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings`;

  if (!code || !workspaceId) {
    console.error('Google Callback Error: Missing parameters.', { code, workspaceId });
    return NextResponse.redirect(`${redirectBase}?tab=seo&error=missing_parameters`);
  }

  try {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;

    // 1. Exchange OAuth authorization code for Google Access/Refresh tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange tokens');
    }

    const { access_token, refresh_token } = tokenData;

    // Google only sends the refresh_token on the first connection or when prompt=consent is used
    if (!refresh_token) {
      console.warn('Warning: No refresh_token returned from Google. Ensure prompt=consent and access_type=offline were requested.');
    }

    // 2. Encrypt the refresh token for secure database storage
    const encryptedRefreshToken = refresh_token ? encrypt(refresh_token) : null;

    // 3. Find if there is an existing SEO project for this workspace
    const { data: existingProject } = await supabase
      .from('seo_projects')
      .select('id, gsc_refresh_token_encrypted')
      .eq('workspace_id', workspaceId)
      .single();

    if (existingProject) {
      // If we got a new refresh token, update it. Otherwise keep the old one
      const tokenToStore = encryptedRefreshToken || existingProject.gsc_refresh_token_encrypted;

      const { error: updateError } = await supabase
        .from('seo_projects')
        .update({
          gsc_connected: true,
          gsc_refresh_token_encrypted: tokenToStore,
          updated_at: new Date().toISOString()
        })
        .eq('workspace_id', workspaceId);

      if (updateError) throw updateError;
    } else {
      // No project existed yet. Create one with a default domain format using workspace id/placeholder
      const { error: insertError } = await supabase
        .from('seo_projects')
        .insert({
          workspace_id: workspaceId,
          domain_url: 'configure-domain.com', // placeholder to be updated by user
          gsc_connected: true,
          gsc_refresh_token_encrypted: encryptedRefreshToken || ''
        });

      if (insertError) throw insertError;
    }

    // Successfully connected Google Search Console!
    return NextResponse.redirect(`${redirectBase}?tab=seo&success=gsc_connected`);
  } catch (error: any) {
    console.error('Google Search Console OAuth Callback Error:', error.message);
    return NextResponse.redirect(`${redirectBase}?tab=seo&error=gsc_auth_failed`);
  }
}
