-- Encrypt workspace Twilio credentials at rest, matching the encrypt()/decrypt() pattern already
-- used for bank_connections, workspace_integrations, and platform_connections. workspaces.twilio_sid
-- and workspaces.twilio_token were the one remaining credential-bearing pair stored as plain TEXT.
--
-- The existing plaintext columns are intentionally left in place for now. A full-repo search found
-- no write path anywhere in src/app/actions or src/app/api that populates twilio_sid/twilio_token —
-- the only UI-adjacent reference (src/lib/validations/automation-settings.schema.ts) is not imported
-- anywhere, and the sole other match (webhooks/resend/inbound/route.ts) writes an unrelated
-- messages.bridge_metadata.twilio_sid field, not this column. That said, this was confirmed by
-- static code search only — whether any real workspace has non-null values here (e.g. seeded
-- out-of-band, outside this repo's traceable code) could not be checked without live database
-- access. Dropping the plaintext columns is therefore deliberately out of scope for this migration;
-- that decision needs to be made explicitly once real data presence is confirmed live, not assumed
-- here. All current read sites now prefer the encrypted columns and fall back to the legacy
-- plaintext ones, so this migration is non-breaking either way.

ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS twilio_sid_encrypted TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS twilio_token_encrypted TEXT;

-- TODO (follow-up, not yet built): no settings UI or server action currently writes
-- twilio_sid_encrypted/twilio_token_encrypted either — there is no live path for a workspace to
-- configure its own Twilio credentials at all today. A future task needs to add a write path
-- (e.g. a POST handler under src/app/api/settings/integrations or a dedicated Twilio settings
-- route) that calls encrypt() from src/lib/encryption.ts before storing, matching the pattern in
-- src/app/api/finance/banks/investec/route.ts, and once real data exists in twilio_sid/twilio_token
-- for any workspace, a separate migration should re-encrypt and null out the legacy plaintext
-- columns rather than leaving both populated indefinitely.
