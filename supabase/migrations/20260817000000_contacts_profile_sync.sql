
-- Tracks when a contact's name/avatar was last synced from the source platform's
-- profile API (Facebook/Instagram), so the webhook handler knows whether to
-- re-fetch (>30 days old) instead of syncing on every inbound message.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS profile_synced_at TIMESTAMPTZ;
