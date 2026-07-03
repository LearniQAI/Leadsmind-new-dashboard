CREATE TABLE IF NOT EXISTS webhook_dead_letters (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    provider TEXT NOT NULL,
    payload JSONB NOT NULL,
    error TEXT NOT NULL,
    error_type TEXT NOT NULL,
    retry_state TEXT NOT NULL DEFAULT 'pending',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups by provider and state
CREATE INDEX IF NOT EXISTS idx_webhook_dead_letters_provider ON webhook_dead_letters(provider, retry_state);

ALTER TABLE webhook_dead_letters ENABLE ROW LEVEL SECURITY;