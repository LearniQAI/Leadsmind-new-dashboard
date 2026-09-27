-- "Send now" must be immediate. The campaign-dispatch worker defers each row to the contact's
-- predicted best send hour (PredictiveIntelligence: 09:00 for a contact with no open history),
-- which held most recipients of a "Send now" until the next morning.
--
-- The flag lives on the queue ROW, not only on the Inngest campaign/dispatch event: the cron run of
-- the same worker claims due rows too (SKIP LOCKED), rate-limited rows are later sent by the cron,
-- and large campaigns are drained over several chained batches. Every one of those must honour it.
--
-- Set at enqueue by updateCampaign for an immediate, non-auto-sender send (card / builder "Send now").
-- Default false: scheduled campaigns, auto-senders and existing rows keep predictive timing unchanged.
ALTER TABLE public.campaign_dispatch_queue
  ADD COLUMN IF NOT EXISTS send_immediately boolean NOT NULL DEFAULT false;
