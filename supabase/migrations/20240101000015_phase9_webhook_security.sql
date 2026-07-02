-- Add webhook secret for secure lead capture
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS webhook_secret TEXT DEFAULT encode(gen_random_bytes(24), 'base64');

-- Ensure unique secrets if needed or just random enough
COMMENT ON COLUMN public.workspaces.webhook_secret IS 'Used to authenticate external lead capture requests';
