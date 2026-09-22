import { validateRequest } from 'twilio';
import { normalizePhone } from '@/lib/phone';
import { resolveWorkspaceTwilioCredentials } from '@/lib/twilio/resolveWorkspaceTwilioCredentials';
import { logger } from '@/shared/logger';

// Twilio signs every webhook with the Auth Token of the account that OWNS the number involved, so the
// right token depends on the number: the number that was TEXTED (`To`) on an inbound message, the
// number that SENT (`From`) on an outbound status callback.
//  - a number saved in a workspace's Twilio settings (workspaces.twilio_number) is validated ONLY
//    against that workspace's own decrypted token, and the request's AccountSid must be that
//    workspace's account -- never the platform token, which cannot sign for it;
//  - a number that belongs to no workspace is a platform-level number, validated against the
//    platform's TWILIO_AUTH_TOKEN (workspaceId is then null).
// The lookup only selects which token to check; it changes nothing.
export interface TwilioWebhookVerdict {
  valid: boolean;
  workspaceId: string | null;
  workspaceOwned: boolean;
}

export async function verifyTwilioWebhook(
  supabaseAdmin: any,
  args: { signature: string | null; url: string; params: Record<string, any>; numberField: 'To' | 'From' },
): Promise<TwilioWebhookVerdict> {
  const { signature, url, params } = args;
  const numberE164 = normalizePhone(String(params[args.numberField] ?? ''));

  const { data: ownerRows } = numberE164
    ? await supabaseAdmin
        .from('workspaces')
        .select('id, twilio_sid, twilio_token, twilio_sid_encrypted, twilio_token_encrypted')
        .eq('twilio_number', numberE164)
    : { data: [] as any[] };
  const owners: any[] = ownerRows ?? [];

  if (owners.length > 0) {
    for (const ws of owners) {
      let creds: { accountSid?: string; authToken?: string } = {};
      try { creds = resolveWorkspaceTwilioCredentials(ws); } catch (err) { logger.error({ err, workspaceId: ws.id }, 'twilio.webhook.credential_decrypt.failed'); }
      if (
        signature && creds.authToken &&
        creds.accountSid && params.AccountSid === creds.accountSid &&
        validateRequest(creds.authToken, signature, url, params)
      ) {
        return { valid: true, workspaceId: ws.id, workspaceOwned: true };
      }
    }
    return { valid: false, workspaceId: null, workspaceOwned: true };
  }

  const platformToken = process.env.TWILIO_AUTH_TOKEN;
  const valid = !!(signature && platformToken && validateRequest(platformToken, signature, url, params));
  return { valid, workspaceId: null, workspaceOwned: false };
}
