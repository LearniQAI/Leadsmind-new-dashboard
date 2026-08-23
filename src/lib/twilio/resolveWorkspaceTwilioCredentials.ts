import { decrypt } from '@/lib/encryption';

export interface WorkspaceTwilioRow {
  twilio_sid?: string | null;
  twilio_token?: string | null;
  twilio_sid_encrypted?: string | null;
  twilio_token_encrypted?: string | null;
}

// saveTwilioCredentials() (src/app/actions/settings.ts), wired to Settings > API
// (src/app/settings/components/tabs/ApiTab.tsx), is the write path and always
// encrypts via src/lib/encryption.ts before saving, nulling the legacy plaintext
// columns on write. The plaintext twilio_sid/twilio_token fallback below only
// matters for a workspace whose row was seeded out-of-band (e.g. directly in the
// database) before that write path existed; no such rows exist as of the
// 20260830000000 audit (0 workspaces had plaintext-only Twilio credentials), so
// no backfill migration was needed.
export function resolveWorkspaceTwilioCredentials(row: WorkspaceTwilioRow | null | undefined) {
  if (!row) return { accountSid: undefined as string | undefined, authToken: undefined as string | undefined };

  const accountSid = row.twilio_sid_encrypted ? decrypt(row.twilio_sid_encrypted) : (row.twilio_sid ?? undefined);
  const authToken = row.twilio_token_encrypted ? decrypt(row.twilio_token_encrypted) : (row.twilio_token ?? undefined);

  return { accountSid, authToken };
}
