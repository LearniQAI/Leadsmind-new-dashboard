export const META_CONFIG = {
  appId: process.env.NEXT_PUBLIC_META_APP_ID ?? '',
  appSecret: process.env.META_APP_SECRET ?? '',
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://leadsmind-new-dashboard.vercel.app'}/api/auth/meta/callback`,
  scopes: [
    'pages_show_list',
    'pages_messaging',
    'pages_manage_metadata',
    'pages_read_engagement',
    'instagram_manage_messages',
    'instagram_basic',
    'whatsapp_business_messaging',
    'whatsapp_business_management',
    'business_management',
  ].join(','),
}

export function isMetaConfigured(): boolean {
  return !!(META_CONFIG.appId && META_CONFIG.appSecret)
}

export function getMetaOAuthURL(
  platform: 'facebook' | 'instagram' | 'whatsapp',
  state: string
): string {
  // state might be a raw string (like a workspace ID) or already JSON string
  let parsedState = {};
  try {
    parsedState = JSON.parse(state);
  } catch {
    parsedState = { workspaceId: state };
  }

  const params = new URLSearchParams({
    client_id: META_CONFIG.appId,
    redirect_uri: META_CONFIG.redirectUri,
    scope: META_CONFIG.scopes,
    response_type: 'code',
    state: JSON.stringify({ platform, ...parsedState }),
  })
  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`
}
