import { createAdminClient } from '@/lib/supabase/server';
import { resolveWorkspaceTwilioCredentials } from '@/lib/twilio/resolveWorkspaceTwilioCredentials';

// Whether a workspace can actually send SMS: its own Twilio account (SID + token) AND a sending
// number. Checked BEFORE a campaign is accepted, so a workspace with no Twilio setup gets a clear
// upfront error instead of a "scheduled" campaign whose every row fails later (the email side has
// the equivalent "connect a Resend account" guard).
export const SMS_NOT_CONFIGURED_MESSAGE =
  'Connect your Twilio account and sending number (Settings › Phone) before scheduling an SMS campaign.';

export interface SmsReadiness {
  ready: boolean;
  missing: Array<'account' | 'number'>;
}

export async function getSmsReadiness(workspaceId: string): Promise<SmsReadiness> {
  const { data } = await createAdminClient()
    .from('workspaces')
    .select('twilio_sid, twilio_token, twilio_sid_encrypted, twilio_token_encrypted, twilio_number')
    .eq('id', workspaceId)
    .maybeSingle();

  const missing: SmsReadiness['missing'] = [];
  let hasAccount = false;
  try {
    const creds = resolveWorkspaceTwilioCredentials(data);
    hasAccount = !!(creds.accountSid && creds.authToken);
  } catch {
    hasAccount = false; // stored credentials that cannot be decrypted are as good as none
  }
  if (!hasAccount) missing.push('account');
  if (!data?.twilio_number) missing.push('number');
  return { ready: missing.length === 0, missing };
}
