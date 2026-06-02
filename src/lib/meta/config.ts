type Platform = 'facebook' | 'instagram' | 'whatsapp';

export const META_CONFIG = {
  appId: process.env.NEXT_PUBLIC_META_APP_ID || process.env.META_APP_ID || '',
  appSecret: process.env.META_APP_SECRET || '',
  webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || '',
};

export function isMetaConfigured(): boolean {
  if (typeof window === 'undefined') {
    return !!(META_CONFIG.appId && META_CONFIG.appSecret);
  }
  return !!META_CONFIG.appId;
}

export function getMetaOAuthURL(platform: Platform, state: string): string {
  const appId = META_CONFIG.appId;
  const redirectBase = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const redirectUri = `${redirectBase}/api/auth/meta/callback`;
  
  // Scopes requested by user
  const scope = 'pages_messaging,pages_manage_metadata,instagram_manage_messages,whatsapp_business_management,whatsapp_business_messaging';
  const stateParam = `${state}:${platform}`;
  
  return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&state=${encodeURIComponent(stateParam)}`;
}
