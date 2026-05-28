-- Add unique constraints to bridge_metadata JSONB extraction
-- This enforces true database-level idempotency to prevent webhook race conditions

-- Since bridge_metadata is JSONB, we need to create unique indexes on the extracted text expressions.
-- We use NULLS NOT DISTINCT or conditional indexing to prevent multiple nulls from clashing.

CREATE UNIQUE INDEX IF NOT EXISTS unique_resend_message_id 
ON messages ((bridge_metadata->>'resend_message_id'))
WHERE (bridge_metadata->>'resend_message_id') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_twilio_message_sid 
ON messages ((bridge_metadata->>'twilio_message_sid'))
WHERE (bridge_metadata->>'twilio_message_sid') IS NOT NULL;
