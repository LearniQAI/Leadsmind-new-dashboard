import { decrypt } from '@/lib/encryption';

export interface WorkspaceTwilioRow {
  twilio_sid?: string | null;
  twilio_token?: string | null;
  twilio_sid_encrypted?: string | null;
  twilio_token_encrypted?: string | null;
}

// No write path currently populates twilio_sid_encrypted/twilio_token_encrypted — there is no
// live UI/action that lets a workspace configure Twilio credentials at all today (see the TODO in
// the 20260725000000 migration). Until that's built, this always falls back to the legacy
// plaintext twilio_sid/twilio_token columns so any out-of-band-seeded workspace keeps working;
// once a real write path lands and starts populating the encrypted columns, those take priority
// and the plaintext fallback naturally stops being used for that workspace.
export function resolveWorkspaceTwilioCredentials(row: WorkspaceTwilioRow | null | undefined) {
  if (!row) return { accountSid: undefined as string | undefined, authToken: undefined as string | undefined };

  const accountSid = row.twilio_sid_encrypted ? decrypt(row.twilio_sid_encrypted) : (row.twilio_sid ?? undefined);
  const authToken = row.twilio_token_encrypted ? decrypt(row.twilio_token_encrypted) : (row.twilio_token ?? undefined);

  return { accountSid, authToken };
}
