export type FrequencyType = 'always' | 'once-session' | 'once-user' | 'cooldown';

export interface FrequencyConfig {
  type: FrequencyType;
  cooldownDays?: number;
}

export function canDisplayCampaign(campaignId: string, config: FrequencyConfig): boolean {
  if (typeof window === 'undefined') return false;

  const storageKey = `lm_campaign_${campaignId}_dismissed`;

  if (config.type === 'always') return true;

  if (config.type === 'once-session') {
    const sessionVal = sessionStorage.getItem(storageKey);
    return !sessionVal;
  }

  if (config.type === 'once-user') {
    const localVal = localStorage.getItem(storageKey);
    return !localVal;
  }

  if (config.type === 'cooldown' && config.cooldownDays) {
    const localVal = localStorage.getItem(storageKey);
    if (!localVal) return true;

    const dismissedAt = parseInt(localVal, 10);
    const now = Date.now();
    const cooldownMs = config.cooldownDays * 24 * 60 * 60 * 1000;

    return now > (dismissedAt + cooldownMs);
  }

  return true;
}

export function recordCampaignDismissal(campaignId: string, config: FrequencyConfig) {
  if (typeof window === 'undefined') return;

  const storageKey = `lm_campaign_${campaignId}_dismissed`;
  const now = Date.now().toString();

  if (config.type === 'once-session') {
    sessionStorage.setItem(storageKey, now);
  } else if (config.type === 'once-user' || config.type === 'cooldown') {
    localStorage.setItem(storageKey, now);
  }
}
