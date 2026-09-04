-- Message Delivery Reliability — Part 1: idempotency key + widened status state machine.
--
-- Context (from docs/message-delivery-reliability-audit.md):
--  * The outbound send path (messaging.ts -> MetaAdapter) has NO client-generated
--    idempotency key today. Two rapid submits, a re-click, or a future automatic
--    retry racing a slow-but-successful send all produce a second independent
--    Graph API call = a real double-send to a real contact. This lands FIRST,
--    before the Part 2 retry queue exists.
--  * messages.status was CHECK (status IN ('sending','sent','delivered','read','failed')).
--    The PRD's state machine also needs 'queued' and 'retrying'.
--  * 'delivered' is only reachable for channels with a real delivery webhook
--    (Facebook Messenger message_deliveries; WhatsApp Cloud API statuses[].status).
--    Instagram Messaging has no delivery webhook at all (confirmed against Meta's
--    current docs) — an Instagram outbound message moves sending -> sent -> read
--    and is never 'delivered'. That per-channel rule cannot be a table CHECK
--    (CHECK cannot reference conversations.platform), so it is enforced in
--    application code via src/lib/meta/deliveryStatus.ts and the Meta webhook
--    handler. This migration only widens the enum.

-- 1. Client-generated idempotency key -------------------------------------------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS client_message_uuid UUID;

COMMENT ON COLUMN public.messages.client_message_uuid IS
  'Client-generated UUID stamped at compose time. Used by sendMessage() to dedupe '
  'duplicate submits / retries so the same user-intended message is never dispatched '
  'to the provider twice. NULL for inbound messages and legacy rows.';

-- Partial unique index — mirrors the existing bridge_metadata idempotency indexes
-- in 20240101000160_harden_webhook_idempotency.sql (multiple NULLs must not clash).
-- This is the database-level backstop: if the app-layer pre-check races, the second
-- INSERT fails with unique_violation (23505) and sendMessage() treats it as an
-- idempotent no-op.
CREATE UNIQUE INDEX IF NOT EXISTS unique_client_message_uuid
  ON public.messages (client_message_uuid)
  WHERE client_message_uuid IS NOT NULL;

-- 2. Widen the status state machine -------------------------------------------
-- Existing values (sending/sent/delivered/read/failed) are all still valid, so no
-- data backfill is required. The inline unnamed CHECK from 20240101000004 is named
-- messages_status_check by Postgres' single-column convention.
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_status_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_status_check
  CHECK (status IN ('queued', 'sending', 'sent', 'retrying', 'delivered', 'read', 'failed'));

-- Partial index for the Part 2 retry worker: find messages still in flight /
-- awaiting a retry attempt without scanning the whole table.
CREATE INDEX IF NOT EXISTS idx_messages_inflight_status
  ON public.messages (status, created_at)
  WHERE status IN ('queued', 'sending', 'retrying');
