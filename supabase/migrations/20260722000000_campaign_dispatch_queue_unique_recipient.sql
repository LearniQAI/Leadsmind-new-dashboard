-- Prevent double-sends: a contact must only ever get one queue row per campaign.
-- Confirmed live before this migration: campaign_dispatch_queue has 0 rows in
-- production, so no pre-existing duplicates need cleanup before adding this.
ALTER TABLE campaign_dispatch_queue
ADD CONSTRAINT campaign_dispatch_queue_campaign_contact_unique
UNIQUE (campaign_id, contact_id);
