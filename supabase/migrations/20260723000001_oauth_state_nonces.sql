-- Task 15 Batch 4: OAuth callback CSRF fix. auth/callback/facebook, /linkedin, /tiktok,
-- auth/google/callback, and auth/meta/callback all trusted the `state` query param directly
-- as workspace_id with no CSRF nonce/session binding — an attacker could complete their own
-- OAuth consent flow, then trick a victim into visiting the callback URL with
-- state=<victimWorkspaceId>, hijacking that workspace's social/GSC connection.
--
-- Fix: `state` is now always a random opaque nonce minted server-side at flow-initiation
-- time (never the workspace_id itself), bound to the real authenticated user + their real
-- session-verified workspace (+ any platform-specific extra data, e.g. which Meta
-- sub-platform was requested). The callback looks the nonce up, confirms it's unexpired and
-- unused, marks it used (single-use), and only then trusts the workspace_id it resolves to.

CREATE TABLE IF NOT EXISTS public.oauth_state_nonces (
  nonce TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  extra JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_oauth_state_nonces_expires ON public.oauth_state_nonces(expires_at);

-- Only ever accessed via the service-role client (minted/consumed server-side during the
-- OAuth flow) — no client-facing RLS policy is needed or granted.
ALTER TABLE public.oauth_state_nonces ENABLE ROW LEVEL SECURITY;
