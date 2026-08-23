-- oauth_access_tokens.token/refresh_token and oauth_authorization_codes.code
-- were stored as plaintext TEXT. Reusing src/lib/encryption.ts's encrypt()
-- (random IV per call, non-deterministic ciphertext) is not viable here --
-- these values are looked up by exact equality (.eq('token', raw), etc. in
-- src/app/api/oauth/token/route.ts and src/lib/api/auth.ts), and encrypted
-- ciphertext of the same plaintext differs on every call, breaking those
-- lookups entirely. This codebase already has the correct pattern for a
-- bearer secret that only ever needs equality-verification (never
-- redisplay): oauth_clients.client_secret_hash and
-- workspace_api_keys.key_hash, both a plain SHA-256 hash compared at lookup
-- time. Applying that same established pattern here instead.
--
-- 0 existing rows in either table (confirmed live), so this is a clean
-- column swap with no backfill needed.

ALTER TABLE public.oauth_authorization_codes
  ADD COLUMN IF NOT EXISTS code_hash TEXT;

ALTER TABLE public.oauth_authorization_codes
  DROP COLUMN IF EXISTS code;

ALTER TABLE public.oauth_authorization_codes
  ALTER COLUMN code_hash SET NOT NULL;

ALTER TABLE public.oauth_authorization_codes
  ADD CONSTRAINT oauth_authorization_codes_code_hash_key UNIQUE (code_hash);

ALTER TABLE public.oauth_access_tokens
  ADD COLUMN IF NOT EXISTS token_hash TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT;

ALTER TABLE public.oauth_access_tokens
  DROP COLUMN IF EXISTS token,
  DROP COLUMN IF EXISTS refresh_token;

ALTER TABLE public.oauth_access_tokens
  ALTER COLUMN token_hash SET NOT NULL;

ALTER TABLE public.oauth_access_tokens
  ADD CONSTRAINT oauth_access_tokens_token_hash_key UNIQUE (token_hash);

ALTER TABLE public.oauth_access_tokens
  ADD CONSTRAINT oauth_access_tokens_refresh_token_hash_key UNIQUE (refresh_token_hash);
