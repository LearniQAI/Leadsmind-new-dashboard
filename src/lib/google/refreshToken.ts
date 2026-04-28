import { createServerClient } from '@/lib/supabase/server';

/**
 * Refreshes the Google Access Token if it's expired or about to expire.
 * This should be used before any Gmail API call.
 */
export async function refreshGoogleToken(connectionId: string, credentials: any) {
  const { accessToken, refreshToken, expiresAt } = credentials;

  // If token is still valid (with 5 minute buffer), return current credentials
  if (expiresAt && Date.now() < (expiresAt - 300000)) {
    console.log('[google-refresh] Token still valid.');
    return accessToken;
  }

  console.log('[google-refresh] Token expired or expiring soon. Refreshing...');
  if (!refreshToken) {
    console.error('[google-refresh] Missing refresh token!');
    throw new Error('No refresh token available. User must re-connect Gmail.');
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();
    console.log('[google-refresh] Google refresh response:', JSON.stringify(data));

    if (!response.ok) {
      throw new Error(data.error_description || 'Failed to refresh Google token');
    }

    const newAccessToken = data.access_token;
    const newExpiresAt = Date.now() + (data.expires_in * 1000);

    // Update DB with new token
    const supabase = await createServerClient();
    await supabase
      .from('platform_connections')
      .update({
        credentials: {
          ...credentials,
          accessToken: newAccessToken,
          expiresAt: newExpiresAt,
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId);

    return newAccessToken;
  } catch (error) {
    console.error('[google-refresh] Error:', error);
    throw error;
  }
}
