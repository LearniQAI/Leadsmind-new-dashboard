-- Consolidation: workspace_webhooks (created via /api/settings/webhooks, used by
-- /settings/developer) was never read by the actual outbound dispatcher
-- (src/lib/inngest/functions/webhookDispatch.ts), which only ever queries webhook_endpoints.
-- Any webhook created through /settings/developer has therefore silently never fired. Rather
-- than maintaining two parallel systems, /api/settings/webhooks (and its logs route) are being
-- repointed at webhook_endpoints — the one table that's actually wired to real delivery.
--
-- workspace_webhooks has no `secret` column, so there is no existing secret to preserve when
-- migrating rows — a fresh CSPRNG secret must be minted and encrypted (via src/lib/encryption.ts
-- encrypt(), which requires the Node runtime's ENCRYPTION_KEY) for each migrated row. That can't
-- be done in plain SQL, so this migration only prepares the schema; the actual data copy is a
-- separate one-time script (scripts/migrate-workspace-webhooks-to-webhook-endpoints.ts) that
-- MUST be run against the live database before workspace_webhooks is dropped. This migration
-- does NOT drop workspace_webhooks — that is a deliberate, separate, manual follow-up step once
-- the data migration has been confirmed to have run (see comment at the bottom of this file).

-- webhook_endpoints needs a label column to reach parity with workspace_webhooks, since
-- /settings/developer's UI (and its "Fired to: <label> (<url>)" log line) depends on it.
ALTER TABLE public.webhook_endpoints ADD COLUMN IF NOT EXISTS label TEXT;

-- webhook_delivery_logs.webhook_id has referenced workspace_webhooks(id) since its creation
-- (20240101000226_webhook_delivery_logs.sql), but the only real writer of this column
-- (webhookDispatch.ts) has always sourced webhook_id from webhook_endpoints — a different
-- table with unrelated UUIDs. Every delivery-log insert from the real dispatcher has therefore
-- been violating this FK constraint and failing silently ever since. This repoints the FK at
-- the table that's actually the source of these ids, fixing delivery logging itself, not just
-- the table-consolidation issue above.
ALTER TABLE public.webhook_delivery_logs DROP CONSTRAINT IF EXISTS webhook_delivery_logs_webhook_id_fkey;
ALTER TABLE public.webhook_delivery_logs
  ADD CONSTRAINT webhook_delivery_logs_webhook_id_fkey
  FOREIGN KEY (webhook_id) REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE;

-- workspace_webhooks is deliberately NOT dropped here. Do not drop it until:
--   1. scripts/migrate-workspace-webhooks-to-webhook-endpoints.ts has been run against this
--      database (confirm via its own output, or `select count(*) from webhook_endpoints where
--      label is not null` before/after), and
--   2. `select count(*) from workspace_webhooks` has been reviewed to confirm no rows would be
--      silently lost.
-- Once both are confirmed, drop it in a separate, explicit follow-up migration.
COMMENT ON TABLE public.workspace_webhooks IS
  'DEPRECATED as of 2026-07-25: superseded by webhook_endpoints (see 20260725000004). No longer read by any application code. Do not add new writers. Pending confirmation of scripts/migrate-workspace-webhooks-to-webhook-endpoints.ts having been run, then drop.';
