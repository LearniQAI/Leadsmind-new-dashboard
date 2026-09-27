import { toast } from 'sonner';
import { EMAIL_DOMAINS_SETTINGS_PATH } from '@/lib/campaigns/fromEmail';

/** Shows a campaign send error; one that asks for a sending domain gets a direct link to it. */
export function toastCampaignSendError(message: string, navigate: (href: string) => void) {
  if (message.includes('Settings → Email Domains')) {
    toast.error(message, { action: { label: 'Open Email Domains', onClick: () => navigate(EMAIL_DOMAINS_SETTINGS_PATH) } });
  } else {
    toast.error(message);
  }
}
