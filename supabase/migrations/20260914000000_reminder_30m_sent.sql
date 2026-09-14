-- Third reminder tier (30 minutes before) alongside the existing
-- reminder_1h_sent / reminder_24h_sent flags on appointments. Same
-- idempotency-flag pattern, no new schema concept.
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_30m_sent BOOLEAN DEFAULT false;
