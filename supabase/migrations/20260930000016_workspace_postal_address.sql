-- Workspace's own postal address, required by CAN-SPAM (and equivalent anti-spam laws) in every
-- commercial email. Workspace-level (one legal business address per workspace), not per sending
-- domain: reusable by campaigns, sequences and CRM/form automations, all of which share the one
-- managed-sending identity resolved in resolveManagedFromIdentity(). Nullable — existing
-- workspaces have none yet; getMarketingEmailConfig()'s callers refuse to send until it's set,
-- they don't backfill it.
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS postal_address TEXT;
